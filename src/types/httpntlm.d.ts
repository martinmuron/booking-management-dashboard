declare module 'httpntlm' {
  interface NtlmOptions {
    url: string;
    username: string;
    password: string;
    workstation?: string;
    domain?: string;
    body?: string;
    headers?: Record<string, string>;
  }

  interface NtlmResponse {
    statusCode?: number;
    body?: string;
    headers?: Record<string, string>;
  }

  function ntlm(options: NtlmOptions, callback: (err: Error | null, res?: NtlmResponse) => void): void;
  function post(options: NtlmOptions, callback: (err: Error | null, res?: NtlmResponse) => void): void;

  export = { ntlm, post };
}