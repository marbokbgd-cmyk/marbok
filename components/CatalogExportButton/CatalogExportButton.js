import { useState } from "react";
import { FaFileExcel } from "react-icons/fa6";
import { urlFromThumbnail } from "@/utils/image";
import styles from "./CatalogExportButton.module.css";

const BRAND_COLOR = "BC4D4D";
function imageAsDataUrl(source) {
    const originalUrl = urlFromThumbnail(source);
    if (!originalUrl) return Promise.resolve(null);
    const separator = originalUrl.includes("?") ? "&" : "?";
    return fetch(`${originalUrl}${separator}w=320&h=320&fit=max&fm=jpg&q=78&bg=ffffff`).then(r => { if (!r.ok) throw new Error(); return r.blob(); }).then(blob => new Promise((resolve,reject) => { const reader=new FileReader(); reader.onloadend=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(blob); }));
}

async function createWorkbook(products) {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Marbok doo";
    const sheet = workbook.addWorksheet("Ponuda", { views: [{ state: "frozen", ySplit: 4 }] });
    sheet.columns = [{width:18},{width:42},{width:20},{width:22},{width:18}];
    sheet.mergeCells("A1:E1");
    const title=sheet.getCell("A1"); title.value="MARBOK – PONUDA"; title.font={size:20,bold:true,color:{argb:"FFFFFFFF"}}; title.alignment={horizontal:"center",vertical:"middle"}; title.fill={type:"pattern",pattern:"solid",fgColor:{argb:`FF${BRAND_COLOR}`}}; sheet.getRow(1).height=34;
    sheet.mergeCells("A2:E2"); sheet.getCell("A2").value=`Izabrano proizvoda: ${products.length}`; sheet.getCell("A2").alignment={horizontal:"center"}; sheet.getCell("A2").font={bold:true,color:{argb:`FF${BRAND_COLOR}`}};
    sheet.mergeCells("A3:E3"); sheet.getCell("A3").value=`Datum ponude: ${new Intl.DateTimeFormat("sr-Latn-RS",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date())}`; sheet.getCell("A3").alignment={horizontal:"center"};
    const header=sheet.addRow(["SLIKA","NAZIV","ŠIFRA","PAKOVANJE","CENA"]); header.height=25; header.eachCell(c=>{c.font={bold:true,color:{argb:"FFFFFFFF"}};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:`FF${BRAND_COLOR}`}};c.alignment={horizontal:"center",vertical:"middle"};});
    for (const product of products) {
        const row=sheet.addRow(["",product?.name||"",product?.productKey||"",product?.package||"",product?.price ? `${product.price} RSD` : ""]); row.height=94; row.eachCell({includeEmpty:true},(c,n)=>{c.alignment={vertical:"middle",horizontal:n===2?"left":"center",wrapText:true};if(n===2)c.font={bold:true,size:12};c.border={top:{style:"thin"},left:{style:"thin"},bottom:{style:"thin"},right:{style:"thin"}};});
        if(product?.image){try{const base64=await imageAsDataUrl(product.image);if(base64){const id=workbook.addImage({base64,extension:"jpeg"});sheet.addImage(id,{tl:{col:.2,row:row.number-.88},ext:{width:86,height:86},editAs:"oneCell"});}}catch{row.getCell(1).value="Slika nije dostupna";}}
    }
    sheet.autoFilter="A4:E4"; sheet.pageSetup={orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0};
    return workbook;
}

function CatalogExportButton({ selectedProducts = [] }) {
    const [isExporting,setIsExporting]=useState(false);
    const handleExport=async()=>{if(isExporting||!selectedProducts.length)return;setIsExporting(true);try{const workbook=await createWorkbook(selectedProducts);const buffer=await workbook.xlsx.writeBuffer();const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`MARBOK_Ponuda_${new Date().toISOString().slice(0,10)}.xlsx`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);}catch(e){console.error(e);window.alert("Excel trenutno nije moguće napraviti. Pokušajte ponovo.");}finally{setIsExporting(false);}};
    return <button type="button" className={styles.exportButton} onClick={handleExport} disabled={isExporting||!selectedProducts.length} title="Preuzmi ponudu samo sa izabranim proizvodima"><FaFileExcel aria-hidden="true" className={styles.icon}/><span className={styles.label}>{isExporting?"Pravim Excel...":`Preuzmi ponudu (${selectedProducts.length})`}</span></button>;
}
export default CatalogExportButton;
