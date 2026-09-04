import ExcelJS from "exceljs";
import { IMPORT_HEADERS, cellText, normalizeLookup } from "./productManagement.js";

const fieldByHeader = new Map([
    ["akcija", "action"],
    ["sifra", "productKey"],
    ["naziv", "name"],
    ["cena rsd", "price"],
    ["pakovanje", "package"],
    ["kategorija", "category"],
    ["sekcija", "group"],
]);

export async function readProductWorkbook(file) {
    if (!file || file.size > 4 * 1024 * 1024) throw new Error("Excel fajl može imati najviše 4 MB.");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.getWorksheet("Proizvodi") || workbook.worksheets[0];
    if (!sheet) throw new Error("Excel fajl nema radni list.");
    const columns = new Map();
    sheet.getRow(1).eachCell((cell, col) => {
        const field = fieldByHeader.get(normalizeLookup(cellText(cell)));
        if (field) columns.set(field, col);
    });
    for (const field of ["action", "productKey", "name", "price", "package", "category", "group"])
        if (!columns.has(field)) throw new Error(`Nedostaje kolona: ${IMPORT_HEADERS[["action", "productKey", "name", "price", "package", "category", "group"].indexOf(field)]}.`);
    const rows = [];
    const last = Math.min(sheet.actualRowCount, 201);
    for (let rowNumber = 2; rowNumber <= last; rowNumber++) {
        const row = sheet.getRow(rowNumber);
        const value = { sourceRow: rowNumber, ...Object.fromEntries([...columns].map(([field, col]) => [field, cellText(row.getCell(col))])) };
        if ([...columns.keys()].some(field => value[field])) rows.push(value);
    }
    if (sheet.actualRowCount > 201) throw new Error("Jedan uvoz može imati najviše 200 redova.");
    if (!rows.length) throw new Error("Excel ne sadrži nijedan proizvod.");
    return rows;
}

export function createProductTemplateWorkbook(categories) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Marbok";
    const sheet = workbook.addWorksheet("Proizvodi", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
        { header: "Akcija", key: "action", width: 18 },
        { header: "Šifra", key: "productKey", width: 18 },
        { header: "Naziv", key: "name", width: 38 },
        { header: "Cena RSD", key: "price", width: 15 },
        { header: "Pakovanje", key: "package", width: 22 },
        { header: "Kategorija", key: "category", width: 30 },
        { header: "Sekcija", key: "group", width: 30 },
    ];
    sheet.addRow({ action: "Dodaj/izmeni", productKey: "PRIMER-001", name: "Primer proizvoda", price: 100, package: "12 kom", category: categories[0]?.title || "Naziv kategorije", group: categories[0]?.groups?.[0]?.title || "Naziv sekcije" });
    sheet.getRow(1).height = 28;
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF913F3F" } };
    sheet.getRow(1).alignment = { vertical: "middle" };
    sheet.autoFilter = { from: "A1", to: "G1" };
    sheet.getColumn(4).numFmt = '#,##0.00';
    for (let row = 2; row <= 201; row++) {
        sheet.getCell(`A${row}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"Dodaj/izmeni,Dodaj,Izmeni,Obriši"'] };
        sheet.getCell(`D${row}`).dataValidation = { type: "decimal", operator: "greaterThanOrEqual", formulae: [0], allowBlank: false };
    }
    const help = workbook.addWorksheet("Uputstvo");
    help.columns = [{ width: 24 }, { width: 88 }];
    help.addRows([
        ["MARBOK UVOZ PROIZVODA", "Popuni list Proizvodi. Ne menjaj nazive kolona."],
        ["Dodaj/izmeni", "Dodaje novu šifru ili menja postojeću. Ovo je preporučena akcija."],
        ["Dodaj", "Radi samo ako šifra još ne postoji."],
        ["Izmeni", "Radi samo ako šifra već postoji."],
        ["Obriši", "Dovoljni su Akcija i Šifra. Brisanje se prikazuje u pregledu pre potvrde."],
        ["Slike", "Slike dodaj pojedinačno kroz ekran Proizvodi nakon uvoza."],
        ["Kategorija i sekcija", "Moraju biti napisane isto kao na listu Kategorije."],
    ]);
    help.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
    help.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF913F3F" } };
    help.eachRow(row => { row.alignment = { vertical: "top", wrapText: true }; row.height = Math.max(row.height || 15, 30); });
    help.getRow(1).height = 52;
    const categoriesSheet = workbook.addWorksheet("Kategorije");
    categoriesSheet.columns = [{ header: "Kategorija", width: 36 }, { header: "Sekcija", width: 36 }];
    for (const category of categories) for (const group of category.groups || []) categoriesSheet.addRow([category.title, group.title]);
    categoriesSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    categoriesSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF913F3F" } };
    categoriesSheet.autoFilter = "A1:B1";
    return workbook;
}

export async function downloadProductTemplate(categories) {
    const workbook = createProductTemplateWorkbook(categories);
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "MARBOK_sablon_za_unos_proizvoda.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
}
