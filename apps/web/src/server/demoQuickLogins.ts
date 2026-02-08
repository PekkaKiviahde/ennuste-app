export type DemoQuickLogin = {
  group: string;
  label: string;
  username: string;
};

const DEMO_QUICK_LOGINS: DemoQuickLogin[] = [
  { group: "Demo A", label: "Tyonjohtaja (A)", username: "site.foreman.a" },
  { group: "Demo A", label: "Vastaava mestari (A)", username: "general.foreman.a" },
  { group: "Demo A", label: "Tyopaallikko (A)", username: "project.manager.a" },
  { group: "Demo A", label: "Tuotantojohtaja (A)", username: "production.manager.a" },
  { group: "Demo A", label: "Hankinta (A)", username: "procurement.a" },
  { group: "Demo A", label: "Johto (luku) (A)", username: "exec.readonly.a" },
  { group: "Demo A", label: "Paakayttaja / Organisaatio-admin (A)", username: "org.admin.a" },
  { group: "Demo A", label: "Myyja (A)", username: "seller.a" },
  { group: "Demo B", label: "Tyonjohtaja (B)", username: "site.foreman.b" },
  { group: "Demo B", label: "Vastaava mestari (B)", username: "general.foreman.b" },
  { group: "Demo B", label: "Tyopaallikko (B)", username: "project.manager.b" },
  { group: "Demo B", label: "Tuotantojohtaja (B)", username: "production.manager.b" },
  { group: "Demo B", label: "Hankinta (B)", username: "procurement.b" },
  { group: "Demo B", label: "Johto (luku) (B)", username: "exec.readonly.b" },
  { group: "Demo B", label: "Paakayttaja / Organisaatio-admin (B)", username: "org.admin.b" },
  { group: "Demo B", label: "Myyja (B)", username: "seller.b" },
  { group: "Kide", label: "Tyopaallikko (Kide)", username: "kide.pm1" },
  { group: "Kide", label: "Vastaava mestari (Kide)", username: "kide.gf1" },
  { group: "Kide", label: "Tyonjohtaja (Kide)", username: "kide.sf1" },
  { group: "Kide", label: "Tuotantojohtaja (Kide)", username: "kide.prod" },
  { group: "Kide", label: "Hankinta (Kide)", username: "kide.proc" },
  { group: "Kide", label: "Johto (luku) (Kide)", username: "kide.exec" },
  { group: "Kide", label: "Paakayttaja / Organisaatio-admin (Kide)", username: "kide.orgadmin" }
];

const DEMO_QUICK_LOGIN_USERNAMES = new Set(DEMO_QUICK_LOGINS.map((entry) => entry.username));

export const listDemoQuickLogins = (): DemoQuickLogin[] => DEMO_QUICK_LOGINS;

export const isDemoQuickLoginUsernameAllowed = (username: string): boolean =>
  DEMO_QUICK_LOGIN_USERNAMES.has(username);
