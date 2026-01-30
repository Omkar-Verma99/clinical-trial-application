declare module 'bcryptjs' {
  function hash(data: string | Buffer, saltOrRounds: string | number): Promise<string>;
  function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  function getRounds(encrypted: string): number;
  function genSalt(rounds?: number, minor?: string): Promise<string>;
  function genSaltSync(rounds?: number, minor?: string): string;
  function hashSync(data: string | Buffer, saltOrRounds?: string | number): string;
  function compareSync(data: string | Buffer, encrypted: string): boolean;
}
