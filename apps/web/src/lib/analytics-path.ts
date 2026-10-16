export const isPrivateAnalyticsPath = (path: string) => /^\/(admin|login|confirm|newsletters)(\/|$)/.test(path);
