-- active_devices: login device tracking used by
--   POST /api/auth/record-device, GET /api/users/:id/devices,
--   GET/DELETE /api/profile/devices.
-- The table was referenced but never created. (The Laravel migration
-- 2026_10_10_000001_repair_schema_for_api_contracts creates the same table.)
CREATE TABLE IF NOT EXISTS active_devices (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name       VARCHAR(255),
  device_type       VARCHAR(255),
  location          VARCHAR(255),
  ip_address        VARCHAR(45),
  last_active       TIMESTAMP,
  is_current_device BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT active_devices_user_id_device_name_ip_address_unique
    UNIQUE (user_id, device_name, ip_address)
);
