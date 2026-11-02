// The demo builds its dates from "today" on the client. Skipping SSR keeps the
// server's clock and timezone out of the initial markup.
export const ssr = false;
