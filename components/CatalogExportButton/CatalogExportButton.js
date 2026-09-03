import { useState } from "react";
import { FaFileExcel } from "react-icons/fa6";
import { urlFromThumbnail } from "@/utils/image";
import styles from "./CatalogExportButton.module.css";

const BRAND_COLOR = "BC4D4D";
const LIGHT_BRAND_COLOR = "F5E8E8";

function safeSheetName(title, usedNames) {
    const base = (title || "Proizvodi")
        .replace(/[\\/*?:[\]]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 31) || "Proizvodi";

    let name = base;
    let counter = 2;
    while (usedNames.has(name.toLowerCase())) {
        const suffix = ` (${counter})`;
        name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
        counter += 1;
    }
    usedNames.add(name.toLowerCase());
    return name;
}

function addCellBorders(row) {
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
            top: { style: "thin", color: { argb: "FFD9D9D9" } },
            left: { style: "thin", color: { argb: "FFD9D9D9" } },
            bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
            right: { style: "thin", color: { argb: "FFD9D9D9" } },
        };
    });
}

function imageAsDataUrl(source) {
    const originalUrl = urlFromThumbnail(source);
    if (!originalUrl) return Promise.resolve(null);

    const separator = originalUrl.includes("?") ? "&" : "?";
    const imageUrl = `${originalUrl}${separator}w=320&h=320&fit=max&fm=jpg&q=78&bg=ffffff`;

    return fetch(imageUrl)
        .then((response) => {
            if (!response.ok) throw new Error("Slika nije dostupna");
            return response.blob();
        })
        .then(
            (blob) =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                })
        );
}

async function runWithLimit(tasks, limit = 6) {
    let nextTask = 0;
    const workers = Array.from(
        { length: Math.min(limit, tasks.length) },
        async () => {
            while (nextTask < tasks.length) {
                const taskIndex = nextTask;
                nextTask += 1;
                await tasks[taskIndex]();
            }
        }
    );
    await Promise.all(workers);
}

async function createWorkbook(categories) {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Marbok doo";
    workbook.created = new Date();

    const usedSheetNames = new Set();
    const imageTasks = [];

    categories.forEach((category) => {
        const worksheet = workbook.addWorksheet(
            safeSheetName(category?.title, usedSheetNames),
            { views: [{ state: "frozen", ySplit: 4 }] }
        );

        worksheet.columns = [
            { key: "image", width: 18 },
            { key: "name", width: 42 },
            { key: "productKey", width: 20 },
            { key: "package", width: 22 },
            { key: "price", width: 18 },
        ];

        worksheet.mergeCells("A1:E1");
        worksheet.getCell("A1").value = "MARBOK – KATALOG PROIZVODA";
        worksheet.getCell("A1").font = {
            size: 20,
            bold: true,
            color: { argb: "FFFFFFFF" },
        };
        worksheet.getCell("A1").alignment = {
            horizontal: "center",
            vertical: "middle",
        };
        worksheet.getCell("A1").fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: `FF${BRAND_COLOR}` },
        };
        worksheet.getRow(1).height = 34;

        worksheet.mergeCells("A2:E2");
        worksheet.getCell("A2").value = category?.title || "Proizvodi";
        worksheet.getCell("A2").font = {
            size: 15,
            bold: true,
            color: { argb: `FF${BRAND_COLOR}` },
        };
        worksheet.getCell("A2").alignment = { horizontal: "center" };

        worksheet.mergeCells("A3:E3");
        worksheet.getCell("A3").value = `Ponuda preuzeta: ${new Intl.DateTimeFormat(
            "sr-Latn-RS",
            { day: "2-digit", month: "2-digit", year: "numeric" }
        ).format(new Date())}`;
        worksheet.getCell("A3").alignment = { horizontal: "center" };
        worksheet.getCell("A3").font = {
            italic: true,
            color: { argb: "FF666666" },
        };

        const headerRow = worksheet.addRow([
            "SLIKA",
            "NAZIV",
            "ŠIFRA",
            "PAKOVANJE",
            "CENA",
        ]);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: `FF${BRAND_COLOR}` },
            };
            cell.alignment = { horizontal: "center", vertical: "middle" };
        });
        addCellBorders(headerRow);

        (category?.categoryProducts || []).forEach((productGroup) => {
            const products = productGroup?.contentArea || [];
            if (!products.length) return;

            const sectionRow = worksheet.addRow([productGroup?.title || "Proizvodi"]);
            worksheet.mergeCells(sectionRow.number, 1, sectionRow.number, 5);
            sectionRow.height = 26;
            sectionRow.getCell(1).font = {
                bold: true,
                size: 12,
                color: { argb: `FF${BRAND_COLOR}` },
            };
            sectionRow.getCell(1).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: `FF${LIGHT_BRAND_COLOR}` },
            };
            sectionRow.getCell(1).alignment = { vertical: "middle" };

            products.forEach((product) => {
                const row = worksheet.addRow([
                    "",
                    product?.name || "",
                    product?.productKey || "",
                    product?.package || "",
                    product?.price ? `${product.price} RSD` : "",
                ]);
                row.height = 94;
                row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
                    cell.alignment = {
                        vertical: "middle",
                        horizontal: columnNumber === 2 ? "left" : "center",
                        wrapText: true,
                    };
                    if (columnNumber === 2) cell.font = { bold: true, size: 12 };
                });
                addCellBorders(row);

                if (product?.image) {
                    imageTasks.push(async () => {
                        try {
                            const base64 = await imageAsDataUrl(product.image);
                            if (!base64) return;
                            const imageId = workbook.addImage({
                                base64,
                                extension: "jpeg",
                            });
                            worksheet.addImage(imageId, {
                                tl: { col: 0.2, row: row.number - 0.88 },
                                ext: { width: 86, height: 86 },
                                editAs: "oneCell",
                            });
                        } catch {
                            row.getCell(1).value = "Slika nije dostupna";
                            row.getCell(1).font = {
                                italic: true,
                                color: { argb: "FF777777" },
                            };
                        }
                    });
                }
            });
        });

        worksheet.autoFilter = "A4:E4";
        worksheet.pageSetup = {
            orientation: "landscape",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: {
                left: 0.25,
                right: 0.25,
                top: 0.5,
                bottom: 0.5,
                header: 0.2,
                footer: 0.2,
            },
        };
    });

    await runWithLimit(imageTasks);
    return workbook;
}

function CatalogExportButton({ categories = [] }) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (isExporting || !categories.length) return;
        setIsExporting(true);

        try {
            const workbook = await createWorkbook(categories);
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const date = new Date().toISOString().slice(0, 10);
            link.href = downloadUrl;
            link.download = `MARBOK_Ponuda_${date}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Greška pri izvozu kataloga:", error);
            window.alert(
                "Excel trenutno nije moguće napraviti. Pokušajte ponovo."
            );
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            type="button"
            className={styles.exportButton}
            onClick={handleExport}
            disabled={isExporting || !categories.length}
            title="Preuzmi trenutnu ponudu u Excel formatu"
        >
            <FaFileExcel aria-hidden="true" className={styles.icon} />
            <span className={styles.label}>
                {isExporting ? "Pravim Excel..." : "Preuzmi Excel"}
            </span>
        </button>
    );
}

export default CatalogExportButton;
