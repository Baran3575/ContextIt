import { hashPassword } from './utils';
import { User } from './db';

export function registerUser(email: string): User {
  const hp = hashPassword("secret");
  return { id: "1", email };
}

export function unusedMain() {
  console.log("hello");
}
