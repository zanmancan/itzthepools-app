// Keep the UI happy: this endpoint is what the Bulk page posts to.
// Re-use the robust bulk handler so both paths behave the same.
export { GET, POST, runtime, dynamic } from "../bulk-create/route";
