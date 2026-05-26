import fs from "fs";
import path from "path";

const docsDir = path.resolve("./docs");

export default function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  const method = context.request.method;

  // GET /api/documents - 获取文档列表
  if (method === "GET" && pathname === "/api/documents") {
    try {
      let documents = [];

      if (fs.existsSync(docsDir)) {
        const files = fs.readdirSync(docsDir).filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return [".md", ".txt", ".pdf", ".docx"].includes(ext);
        });

        documents = files.map((file) => {
          const filePath = path.join(docsDir, file);
          const stats = fs.statSync(filePath);
          return { name: file, chunks: 0, size: stats.size };
        });
      }

      return new Response(JSON.stringify({ success: true, documents }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // GET /api/health - 健康检查
  if (method === "GET" && pathname === "/api/health") {
    return new Response(
      JSON.stringify({ success: true, message: "RAG Bot API is running" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 其他请求返回帮助信息
  return new Response(
    JSON.stringify({
      success: false,
      error: "Not Found",
      available: ["/api/documents", "/api/health"],
    }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
