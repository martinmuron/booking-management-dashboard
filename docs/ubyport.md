# UbyPort Integration Notes

- For all API contract changes, onboarding procedures, and operational rules, refer to `Manual_Ubyport_2_0_v1.docx` (latest Ubyport 2.0 manual supplied by Czech Police).
- Legacy web-service details are also outlined in `ubyport.doc`; keep the file for historical reference until all integrations run on the 2.0 endpoints.
- Environment variables needed by the current implementation are documented in `.env.example` under the "UbyPort integration" section. Ensure they are populated via Vercel environment variables before deploying.
- The existing SOAP client uses NTLM authentication. If the police migrate to a different authentication scheme (as hinted for Ubyport 2.0), update `src/services/ubyport.service.ts` accordingly and document the change here.
