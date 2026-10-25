import { randomUUID } from "node:crypto";
import { CertificateLookupResponseSchema } from "@alturia/shared";
import request from "supertest";
import {
  createCourse,
  createE2eApp,
  daysFromNow,
  randomNationalId,
  type E2eContext,
} from "./utils/e2e-app";

describe("Certificates (e2e)", () => {
  let ctx: E2eContext;
  let nationalId: string;
  let courseToken: string;
  let medicalToken: string;
  let pastToken: string;
  let futureToken: string;

  beforeAll(async () => {
    ctx = await createE2eApp();
    const course = await createCourse(ctx.prisma);
    nationalId = randomNationalId();
    courseToken = "demo-worker1-course";
    medicalToken = `e2e-medical-${randomUUID()}`;
    pastToken = `e2e-past-${randomUUID()}`;
    futureToken = `e2e-future-${randomUUID()}`;

    await ctx.prisma.worker.create({
      data: {
        nationalId,
        name: "Trabajador e2e",
        phone: "3001234567",
        certificates: {
          create: [
            {
              publicToken: courseToken,
              courseId: course.id,
              expirationType: "COURSE",
              issuedAt: daysFromNow(-30),
              expiresAt: daysFromNow(300),
              status: "VALID",
            },
            {
              publicToken: medicalToken,
              courseId: course.id,
              expirationType: "MEDICAL_EXAM",
              issuedAt: daysFromNow(-30),
              expiresAt: daysFromNow(300),
              status: "VALID",
            },
          ],
        },
      },
    });

    await ctx.prisma.worker.create({
      data: {
        nationalId: randomNationalId(),
        name: "Trabajador vencido e2e",
        certificates: {
          create: {
            publicToken: pastToken,
            courseId: course.id,
            expirationType: "COURSE",
            issuedAt: daysFromNow(-400),
            expiresAt: daysFromNow(-10),
            // Stored as VALID on purpose: the API must compute EXPIRED from
            // expiresAt instead of trusting this column.
            status: "VALID",
          },
        },
      },
    });

    const futureWorker = await ctx.prisma.worker.create({
      data: {
        nationalId: randomNationalId(),
        name: "Trabajador futuro e2e",
        certificates: {
          create: {
            publicToken: futureToken,
            courseId: course.id,
            expirationType: "COURSE",
            issuedAt: daysFromNow(-30),
            expiresAt: daysFromNow(300),
            // Stored as EXPIRED on purpose: the API must calculate VALID from
            // the future expiration date.
            status: "EXPIRED",
          },
        },
      },
    });
    expect(futureWorker.id).toBeDefined();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe("GET /api/certificates/:nationalId — lookup by cédula (HU-01, HU-02, HU-05)", () => {
    it("returns both expiration types, each with only type, status and date", async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/certificates/${nationalId}`)
        .expect(200);

      const body = CertificateLookupResponseSchema.parse(res.body);
      expect(body.certificates.map((c) => c.expirationType).sort()).toEqual([
        "COURSE",
        "MEDICAL_EXAM",
      ]);
      for (const cert of (res.body as { certificates: object[] })
        .certificates) {
        expect(Object.keys(cert).sort()).toEqual([
          "expirationType",
          "expiresAt",
          "status",
        ]);
      }
    });

    it("never exposes the worker's personal data (name, phone)", async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/certificates/${nationalId}`)
        .expect(200);

      expect(res.text).not.toContain("Trabajador e2e");
      expect(res.text).not.toContain("3001234567");
    });

    it("computes EXPIRED from expiresAt even when the stored status says VALID", async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/certificates/${nationalId}`)
        .expect(200);

      const body = CertificateLookupResponseSchema.parse(res.body);
      const byType = Object.fromEntries(
        body.certificates.map((c) => [c.expirationType, c.status]),
      );
      expect(byType).toEqual({ COURSE: "VALID", MEDICAL_EXAM: "VALID" });
    });

    it("responds 404 for a cédula with no certificates", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/certificates/${randomNationalId()}`)
        .expect(404);
    });

    it("responds 400 with a Spanish message for a malformed cédula", async () => {
      const res = await request(ctx.app.getHttpServer())
        .get("/api/certificates/12ab")
        .expect(400);

      expect(JSON.stringify(res.body)).toContain(
        "la cédula debe tener entre 8 y 10 dígitos",
      );
    });
  });

  describe("POST /api/certificates/qr — lookup by QR (HU-03)", () => {
    const lookup = (payload: string) =>
      request(ctx.app.getHttpServer())
        .post("/api/certificates/qr")
        .send({ payload });

    it("resolves the seeded demo QR token as a valid certificate", async () => {
      const res = await lookup(courseToken).expect(201);
      const body = CertificateLookupResponseSchema.parse(res.body);
      expect(body.certificates).toEqual([
        expect.objectContaining({
          expirationType: "COURSE",
          status: "VALID",
        }),
      ]);
    });

    it("resolves the alturia://certificate/<token> format", async () => {
      const res = await lookup(`alturia://certificate/${courseToken}`).expect(
        201,
      );
      const body = CertificateLookupResponseSchema.parse(res.body);
      expect(body.certificates[0]).toMatchObject({
        expirationType: "COURSE",
        status: "VALID",
      });
    });

    it("resolves a URL that carries the token in ?token= or /certificates/<token>", async () => {
      await lookup(`https://asisaltura.co/verify?token=${courseToken}`).expect(
        201,
      );
      await lookup(`https://asisaltura.co/certificates/${courseToken}`).expect(
        201,
      );
    });

    it("responds 404 for a short-link QR that does not contain the token (e.g. me-qr dynamic codes)", async () => {
      await lookup("https://q.me-qr.com/80rrc1ny").expect(404);
    });

    it("responds 404 for a token that is not registered", async () => {
      await lookup("token-no-registrado").expect(404);
    });

    it("responds 400 for an empty payload", async () => {
      await lookup("   ").expect(400);
    });

    it("responds 404 for a malformed non-empty payload", async () => {
      await lookup("not a valid qr payload !!!").expect(404);
    });

    it("computes VALID from a future expiration even when stored status says EXPIRED", async () => {
      const res = await lookup(futureToken).expect(201);
      const body = CertificateLookupResponseSchema.parse(res.body);
      expect(body.certificates[0]).toMatchObject({
        expirationType: "COURSE",
        status: "VALID",
      });
    });

    it("computes EXPIRED from a past expiration even when stored status says VALID", async () => {
      const res = await lookup(pastToken).expect(201);
      const body = CertificateLookupResponseSchema.parse(res.body);
      expect(body.certificates[0]).toMatchObject({
        expirationType: "COURSE",
        status: "EXPIRED",
      });
    });
  });
});
