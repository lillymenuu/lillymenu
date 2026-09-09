import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

async function proxy(request: Request, method: "POST" | "PATCH" | "DELETE") {
  const body = await request.text();
  try {
    const data = await phpApiFetch("/admin/api/v1/produtos.php", {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg: erro }, { status });
  }
}

export function POST(request: Request) {
  return proxy(request, "POST");
}

export function PATCH(request: Request) {
  return proxy(request, "PATCH");
}

export function DELETE(request: Request) {
  return proxy(request, "DELETE");
}
