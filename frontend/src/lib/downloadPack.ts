import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function downloadLecturePack(
  lectureTitle: string, 
  flashcards: any[], 
  summaryText?: string, 
  explanations?: string
) {
  const zip = new JSZip();

  // Add flashcards as CSV
  if (flashcards && flashcards.length > 0) {
    let csv = 'Front,Back\n';
    flashcards.forEach(card => {
      // Escape quotes for CSV
      const front = (card.front || '').replace(/"/g, '""');
      const back = (card.back || '').replace(/"/g, '""');
      csv += `"${front}","${back}"\n`;
    });
    zip.file(`${lectureTitle.replace(/[^a-z0-9]/gi, '_')}_Flashcards.csv`, csv);
  }

  // Add summary text
  if (summaryText) {
    zip.file(`${lectureTitle.replace(/[^a-z0-9]/gi, '_')}_Summary.txt`, summaryText);
  }

  // Add explanations text (HTML or Markdown)
  if (explanations) {
    zip.file(`${lectureTitle.replace(/[^a-z0-9]/gi, '_')}_Explanations.html`, explanations);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${lectureTitle.replace(/[^a-z0-9]/gi, '_')}_StudyPack.zip`);
}
