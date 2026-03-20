import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data to Excel
 */
export const exportToExcel = (data, fileName = '상품리스트') => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Export data to PDF
 * Assumes data is pre-formatted for display
 */
export const exportToPDF = (headers, rows, title = '상품 제안서') => {
    // Orientation: landscape if many columns
    const orientation = headers.length > 7 ? 'l' : 'p';
    const doc = new jsPDF(orientation, 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();

    // Header section
    doc.setFillColor(31, 41, 55); // Dark blue gray
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(title, 14, 20);

    const dateStr = `생성일: ${new Date().toLocaleDateString('ko-KR')}`;
    doc.setFontSize(10);
    doc.text(dateStr, 14, 30);

    // AutoTable
    doc.autoTable({
        startY: 45,
        head: [headers],
        body: rows,
        theme: 'grid',
        styles: {
            fontSize: headers.length > 10 ? 6 : 8,
            fontStyle: 'normal',
            cellPadding: 2,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
        },
        headStyles: {
            fillColor: [79, 70, 229],
            textColor: 255,
            fontSize: headers.length > 10 ? 7 : 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            // Right align numeric-looking columns (Price, Qty etc)
            // This is a heuristic, let's assume any column containing '원' or '개' or being price related is right aligned
        },
        didDrawPage: function (data) {
            // Footer
            const str = "Page " + doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            doc.text(str, data.settings.margin.left, pageHeight - 10);
        }
    });

    doc.save(`${title}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Handle Excel Upload
 */
export const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);
            resolve(json);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
