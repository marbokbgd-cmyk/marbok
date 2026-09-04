import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";

const source = await readFile(new URL("../utils/productManagement.js", import.meta.url), "utf8");
const management = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const catalog = {
    categories: [
        { id: "cat-1", title: "Kućna i lična higijena", groups: [{ id: "group-1", title: "Deterdženti" }] },
        { id: "cat-2", title: "Konditorski proizvodi", groups: [{ id: "group-2", title: "Žele bombone" }] },
    ],
    products: [
        { id: "product-1", productKey: "A-100", name: "Stari proizvod", groupId: "group-1" },
    ],
};

test("product validation requires name, key, price and an existing target group", () => {
    const empty = management.validateProduct({});
    assert.equal(empty.errors.length, 4);
    const valid = management.validateProduct({ name: "Proizvod", productKey: "A1", price: "125,50", package: "12 kom", groupId: "group-1" });
    assert.deepEqual(valid.errors, []);
    assert.equal(valid.product.price, "125,50");
});

test("Excel preview resolves Serbian diacritics and separates add, update and delete", () => {
    const rows = [
        { action: "Izmeni", productKey: "A-100", name: "Novi naziv", price: "200", package: "6 kom", category: "Kucna i licna higijena", group: "Deterdženti" },
        { action: "Dodaj", productKey: "B-200", name: "Nova bombona", price: "50,5", package: "24 kom", category: "Konditorski proizvodi", group: "Zele bombone" },
        { action: "Obriši", productKey: "A-100" },
    ];
    const plan = management.planImport(rows, catalog);
    assert.equal(plan[0].existingId, "product-1");
    assert.equal(plan[0].product.groupId, "group-1");
    assert.equal(plan[1].existingId, null);
    assert.equal(plan[1].product.groupId, "group-2");
    assert.equal(plan[2].operation, "delete");
    assert.match(plan[2].errors.join(" "), /ponavlja/);
});

test("Excel preview rejects unsafe ambiguity before database changes", () => {
    const plan = management.planImport([
        { action: "Dodaj", productKey: "A-100", name: "Duplikat", price: "1", category: "Konditorski proizvodi", group: "Žele bombone" },
        { action: "Izmeni", productKey: "NEMA", name: "Nepostojeći", price: "1", category: "Konditorski proizvodi", group: "Žele bombone" },
        { action: "Nešto", productKey: "X", name: "Loša akcija", price: "-1", category: "Pogrešna", group: "Pogrešna" },
    ], catalog);
    assert.match(plan[0].errors.join(" "), /već postoji/);
    assert.match(plan[1].errors.join(" "), /ne postoji/);
    assert.match(plan[2].errors.join(" "), /Nepoznata akcija/);
    assert.match(plan[2].errors.join(" "), /Cena/);
    assert.match(plan[2].errors.join(" "), /Kategorija/);
});

test("formula and rich-text cells are read as displayed text, not executable formulas", () => {
    assert.equal(management.cellText({ value: { formula: "2+2", result: 4 } }), "4");
    assert.equal(management.cellText({ value: { richText: [{ text: "MAR" }, { text: "BOK" }] } }), "MARBOK");
});

test("generated Excel template retains headers, guidance, filters and validations", async () => {
    const { createProductTemplateWorkbook } = await import("../utils/productWorkbook.js");
    const workbook = createProductTemplateWorkbook(catalog.categories);
    const buffer = await workbook.xlsx.writeBuffer();
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(buffer);
    assert.deepEqual(reopened.worksheets.map(sheet => sheet.name), ["Proizvodi", "Uputstvo", "Kategorije"]);
    assert.deepEqual(reopened.getWorksheet("Proizvodi").getRow(1).values.slice(1), management.IMPORT_HEADERS);
    assert.equal(reopened.getWorksheet("Proizvodi").autoFilter, "A1:G1");
    assert.equal(reopened.getWorksheet("Proizvodi").getCell("A2").dataValidation.type, "list");
    assert.equal(reopened.getWorksheet("Kategorije").getCell("A2").value, "Kućna i lična higijena");
    assert.equal(reopened.getWorksheet("Kategorije").getCell("B3").value, "Žele bombone");
});
