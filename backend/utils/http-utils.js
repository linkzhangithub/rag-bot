const https = require("https");
const config = require("../config");

/**
 * HTTP请求工具类
 * 封装GLM API调用，支持流式和非流式请求
 */
class HttpUtils {
  /**
   * 发送请求到GLM API
   * @param {Object} messages - 消息列表
   * @param {Object} options - 额外选项
   * @returns {Promise<string>} 响应内容
   */
  static async request(messages, options = {}) {
    const { stream = false, res = null, onChunk = null } = options;

    const body = JSON.stringify({
      model: "glm-4-flash",
      messages,
      temperature: 0.1,
      top_p: 0.5,
      stream,
    });

    const requestOptions = {
      hostname: "open.bigmodel.cn",
      port: 443,
      path: "/api/paas/v4/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.zhipuApiKey}`,
      },
      timeout: 60000,
    };

    if (stream) {
      return this.streamRequest(requestOptions, body, res, onChunk);
    }

    return this.normalRequest(requestOptions, body);
  }

  /**
   * 普通非流式请求
   */
  static normalRequest(options, body) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          try {
            // 检查响应状态码
            if (res.statusCode < 200 || res.statusCode >= 300) {
              const error = new Error(
                `API 请求失败，状态码: ${res.statusCode}`,
              );
              error.statusCode = res.statusCode;
              try {
                error.response = JSON.parse(responseData);
              } catch {
                error.response = responseData;
              }
              reject(error);
              return;
            }

            const response = JSON.parse(responseData);
            if (!response?.choices?.[0]?.message?.content) {
              throw new Error("对话响应格式错误");
            }
            resolve(response.choices[0].message.content);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  /**
   * SSE流式请求
   */
  static streamRequest(options, body, res, onChunk) {
    return new Promise((resolve) => {
      const req = https.request(options, (apiRes) => {
        apiRes.on("data", (chunk) => {
          const lines = chunk
            .toString()
            .split("\n")
            .filter((line) => line.trim());

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6);
            if (data === "[DONE]") {
              res.write("data: [DONE]\n\n");
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
                onChunk && onChunk(content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        });

        apiRes.on("end", () => {
          res.write("data: [DONE]\n\n");
          res.end();
          resolve();
        });
      });

      req.on("error", (error) => {
        console.error("SSE 请求失败:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
        resolve();
      });

      req.on("timeout", () => {
        req.destroy();
        console.error("SSE 请求超时");
        res.write(
          `data: ${JSON.stringify({ error: "请求超时，请稍后重试" })}\n\n`,
        );
        res.end();
        resolve();
      });

      req.write(body);
      req.end();
    });
  }
}

module.exports = HttpUtils;
