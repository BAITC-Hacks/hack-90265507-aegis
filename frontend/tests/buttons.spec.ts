import { test, expect } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
const product = {id:515291,name:"Автомат Legrand 3P 160А",article:"027228",price:64920,quantity:23,properties:{NOMINALNYY_TOK:"160"},stores:[],certificates:[]};
test.beforeEach(async({page})=>{
 await page.route("**/api/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  await route.fulfill({json:path.includes("/products/")?product:{items:[product],total:1,totalPages:1,page:1,limit:24}});
 });
});
test("header navigation, city and home search",async({page})=>{
 await page.goto("/");
 await page.getByRole("combobox",{name:"Город"}).selectOption("Алматы");
 await page.getByRole("button",{name:"Доставка и оплата",exact:true}).click();
 await expect(page.getByText("Выбранный город:")).toContainText("Алматы");
 await page.getByRole("button",{name:"Для бизнеса",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Закупки для бизнеса"})).toBeVisible();
 await page.getByRole("button",{name:"Контакты",exact:true}).click();
 await expect(page.getByRole("link",{name:/официальный сайт/})).toHaveAttribute("href","https://ekt.kz");
 await page.getByRole("link",{name:"EKTiQ",exact:true}).click();
 await page.getByPlaceholder("Например: автомат Legrand, 3P, 160A, 18kA").fill("027228");
 await page.locator(".hero-search").getByRole("button",{name:"Найти"}).click();
 await expect(page).toHaveURL(/q=027228/);
});
test("category is forwarded and can be cleared",async({page})=>{
 await page.goto("/");
 const request=page.waitForRequest(r=>r.url().includes("/api/catalog/search")&&new URL(r.url()).searchParams.get("category")==="Освещение");
 await page.getByRole("button",{name:"Освещение",exact:true}).click();await request;
 await expect(page.getByText(/Группа: Освещение/)).toBeVisible();
 await page.getByRole("button",{name:"Сбросить категорию"}).click();await expect(page).not.toHaveURL(/category=/);
});
test("specification reads DOCX, XLSX and performs search",async({page})=>{
 await page.goto("/specification");
 const docx=zipSync({"word/document.xml":strToU8('<w:document xmlns:w="urn:test"><w:body><w:p><w:r><w:t>027228</w:t></w:r></w:p></w:body></w:document>')});
 await page.locator('input[type=file]').setInputFiles({name:"sample.docx",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",buffer:Buffer.from(docx)});
 await expect(page.getByRole("textbox",{name:/Позиции/})).toHaveValue("027228");
 const xlsx=zipSync({"xl/sharedStrings.xml":strToU8('<sst><si><t>Legrand</t></si></sst>'),"xl/worksheets/sheet1.xml":strToU8('<worksheet><sheetData><row><c t="s"><v>0</v></c><c t="inlineStr"><is><t>027228</t></is></c></row></sheetData></worksheet>')});
 await page.locator('input[type=file]').setInputFiles({name:"sample.xlsx",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",buffer:Buffer.from(xlsx)});
 await expect(page.getByRole("textbox",{name:/Позиции/})).toHaveValue("Legrand\t027228");
 await page.getByRole("textbox",{name:/Позиции/}).fill("027228");
 await page.getByRole("button",{name:"Найти позиции"}).click();
 await expect(page.locator(".import-result").getByRole("link",{name:product.name})).toBeVisible();
});
test("unsupported documents have an actionable error",async({page})=>{
 await page.goto("/specification");
 await page.locator('input[type=file]').setInputFiles({name:"legacy.xls",mimeType:"application/octet-stream",buffer:Buffer.from("bad")});
 await expect(page.getByRole("alert")).toContainText("пересохраните");
 await expect(page.getByRole("button",{name:"Выбрать файл"})).toBeEnabled();
});
test("cart confirmation leads to downloadable request without payment",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"Добавить в корзину",exact:true}).first().click();
 await page.getByRole("button",{name:"Да, добавить",exact:true}).click();
 await page.locator(".account-actions").getByRole("link",{name:/Корзина/}).click();
 await page.getByRole("link",{name:"Подготовить заявку"}).click();
 await expect(page.getByRole("heading",{name:"Подготовить заявку"})).toBeVisible();
 const download=page.waitForEvent("download");
 await page.getByRole("button",{name:"Скачать заявку"}).click();
 expect((await download).suggestedFilename()).toBe("EKTiQ-заявка.txt");
 await expect(page.getByText("Файл подготовлен для скачивания. Заявка не отправлена менеджеру.")).toBeVisible();
});
test("profile saves local project and exports it",async({page})=>{
 await page.goto("/profile");await page.getByRole("textbox",{name:"Название проекта"}).fill("Щитовая");
 await page.getByRole("button",{name:"Сохранить название"}).click();await page.reload();
 await expect(page.getByRole("textbox",{name:"Название проекта"})).toHaveValue("Щитовая");
 const download=page.waitForEvent("download");await page.getByRole("button",{name:"Скачать проект"}).click();
 expect((await download).suggestedFilename()).toBe("EKTiQ-проект.json");
});
test("analogue action opens a working request form",async({page})=>{
 await page.goto("/");await page.getByRole("button",{name:/Подобрать аналог/}).click();
 await expect(page).toHaveURL(/\/analogue$/);
 await expect(page.getByRole("button",{name:"Подобрать",exact:true})).toBeDisabled();
 await page.getByRole("textbox",{name:"Исходный товар"}).fill("027228");
 await expect(page.getByRole("button",{name:"Подобрать",exact:true})).toBeEnabled();
});
test("photo OCR recognizes a clear label with real language models",async({page})=>{
 test.skip(!process.env.OCR_LIVE,"Set OCR_LIVE=1 for online language-model download.");
 test.setTimeout(120000);
 await page.goto("/identify");
 const image=await page.evaluate(()=>{
  const c=document.createElement("canvas");c.width=1100;c.height=220;const x=c.getContext("2d")!;x.fillStyle="white";x.fillRect(0,0,c.width,c.height);x.fillStyle="black";x.font="bold 64px Arial";x.fillText("LEGRAND 027228 160A",35,120);return c.toDataURL("image/png").split(",")[1];
 });
 await page.locator('input[type=file]').setInputFiles({name:"label.png",mimeType:"image/png",buffer:Buffer.from(image,"base64")});
 await expect(page.getByRole("textbox",{name:/Позиции/})).toHaveValue(/027228/,{timeout:110000});
});

test("PDF text extraction runs in browser worker",async({page})=>{
 const objects=[
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  "<< /Length 39 >>\nstream\nBT /F1 18 Tf 20 100 Td (027228) Tj ET\nendstream"
 ];
 let data="%PDF-1.4\n";const offsets=[0];
 objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(data));data+=(i+1)+" 0 obj\n"+o+"\nendobj\n";});
 const xref=Buffer.byteLength(data);data+="xref\n0 6\n0000000000 65535 f \n"+offsets.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")+"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF";
 await page.goto("/specification");
 await page.locator('input[type=file]').setInputFiles({name:"sample.pdf",mimeType:"application/pdf",buffer:Buffer.from(data)});
 await expect(page.getByRole("textbox",{name:/Позиции/})).toHaveValue(/027228/);
});

test("catalog filters persist in URL and sort resets pagination",async({page})=>{
 await page.route("**/api/catalog/search?**",route=>route.fulfill({json:{items:[product],total:1,totalPages:1,page:1,limit:24,technicalAvailable:["current","poles"],coverage:{candidates:100,checked:24,failed:0,partial:false,unknownPrice:0,unknownStock:0,unknownTechnical:0}}}));
 await page.goto("/catalog?q=Legrand&city="+encodeURIComponent("Алматы")+"&page=2");
 await page.getByLabel("Цена от, ₸").fill("10000");await page.getByLabel("Цена до, ₸").fill("50000");
 await page.getByLabel("Бренд",{exact:true}).fill("Legrand");
 await page.getByLabel("Ток, А",{exact:true}).fill("160");
 await page.getByRole("button",{name:"Применить фильтры",exact:true}).click();
 await expect(page).toHaveURL(/minPrice=10000/);await expect(page).toHaveURL(/maxPrice=50000/);await expect(page).toHaveURL(/page=1/);
 await page.getByLabel("В наличии в выбранном городе").check();
 await page.getByLabel("Сортировка").selectOption("stock");
 await expect(page).toHaveURL(/inStock=true/);await expect(page).toHaveURL(/sort=stock/);
 await page.reload();await expect(page.getByLabel("Цена до, ₸")).toHaveValue("50000");
 await expect(page.getByLabel("В наличии в выбранном городе")).toBeChecked();
 await page.getByRole("button",{name:"Сбросить фильтры",exact:true}).click();await expect(page).not.toHaveURL(/maxPrice|inStock|current=/);
});
test("city stock changes require reconfirmation and limit cart quantity",async({page})=>{
 let fresh=0;
 await page.route("**/api/products/**",async route=>{
  const u=new URL(route.request().url());const isFresh=u.searchParams.get("fresh")==="true";if(isFresh)fresh++;
  await route.fulfill({json:{...product,stockCity:"Астана",totalQuantity:23,quantity:isFresh?2:8}});
 });
 await page.goto("/");
 await page.getByRole("button",{name:"Добавить в корзину",exact:true}).first().click();
 await page.getByRole("button",{name:"Да, добавить",exact:true}).click();
 await expect(page.getByRole("alert")).toContainText("Проверены цена и остаток");
 await expect(page.locator(".cart-confirm-modal")).toContainText("2 шт.");
 await page.getByRole("button",{name:"Да, добавить",exact:true}).click();
 await page.locator(".account-actions").getByRole("link",{name:/Корзина/}).click();
 await expect(page.locator(".cart-page")).toContainText("Астана");
 expect(fresh).toBe(2);
});
