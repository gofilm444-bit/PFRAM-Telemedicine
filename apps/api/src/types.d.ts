import "@fastify/jwt";
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      publicId: string;
      role: "MOTHER" | "MIDWIFE" | "ADMIN";
    };
    user: {
      sub: string;
      publicId: string;
      role: "MOTHER" | "MIDWIFE" | "ADMIN";
    };
  }
}
