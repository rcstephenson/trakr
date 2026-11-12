// Build-time stand-in for dexie-cloud-addon when no VITE_DEXIE_CLOUD_URL is set (see vite.config.ts),
// so the local-only build does not ship the addon. Never called: schema.ts only attaches it
// when a database URL is configured.
export default function dexieCloudStub(): void {}
