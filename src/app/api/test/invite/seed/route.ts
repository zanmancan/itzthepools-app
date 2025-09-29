// Back-compat shim: older tests may call /api/test/invite/seed
// Delegate to the canonical seeder implemented at /api/test/seed-invite.
export { GET, runtime, dynamic } from "../../seed-invite/route";
