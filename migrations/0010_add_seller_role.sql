-- Add SELLER role for SaaS sales UI

INSERT INTO roles (role_code, role_name_fi, description)
VALUES ('SELLER', 'Myyja', 'SaaS-myyja: myyntinakyma')
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO permissions (permission_code, description)
VALUES ('SELLER_UI', 'Saa kayttaa myyjan UI-nakymaa')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO role_permissions (role_code, permission_code)
VALUES ('SELLER', 'SELLER_UI')
ON CONFLICT DO NOTHING;
