import test from "node:test";
import assert from "node:assert/strict";
import { containsPaymentCredentials } from "./privacy.js";

test("payment credentials are blocked before sending to the assistant", () => {
  for (const value of ["4111 1111 1111 1111", "4111-1111-1111-1111", "CVV: 123", "PIN 1234", "код из смс 123456", "KZ86125KZT5004100100", "IBAN KZ86 125K ZT50 0410 0100"]) {
    assert.equal(containsPaymentCredentials(value), true, value);
  }
});

test("ordinary product requests and prices remain allowed", () => {
  for (const value of ["Светильник от 40000 до 50000 тенге", "Артикул 12345678, 10 шт.", "телефон +7 777 123 45 67", "Автомат 16A 230В"]) {
    assert.equal(containsPaymentCredentials(value), false, value);
  }
});
