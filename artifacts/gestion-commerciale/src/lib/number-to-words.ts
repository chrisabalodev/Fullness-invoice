export function numberToFrenchWords(n: number): string {
  if (n === 0) return "zéro";
  
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  function convertLessThanOneThousand(num: number): string {
    if (num === 0) return "";
    
    let result = "";
    
    if (num >= 100) {
      const hundreds = Math.floor(num / 100);
      result += (hundreds === 1 ? "cent" : units[hundreds] + " cent") + " ";
      num %= 100;
    }
    
    if (num >= 20) {
      const tensDigit = Math.floor(num / 10);
      const unitsDigit = num % 10;
      
      if (tensDigit === 7 || tensDigit === 9) {
        result += tens[tensDigit - 1] + "-" + teens[unitsDigit] + " ";
      } else {
        result += tens[tensDigit] + (unitsDigit === 1 ? " et un" : unitsDigit > 0 ? "-" + units[unitsDigit] : "") + " ";
      }
    } else if (num >= 10) {
      result += teens[num - 10] + " ";
    } else if (num > 0) {
      result += units[num] + " ";
    }
    
    return result.trim();
  }

  if (n < 0) return "moins " + numberToFrenchWords(Math.abs(n));

  let result = "";

  if (n >= 1000000) {
    const millions = Math.floor(n / 1000000);
    result += (millions === 1 ? "un million" : convertLessThanOneThousand(millions) + " millions") + " ";
    n %= 1000000;
  }

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    result += (thousands === 1 ? "mille" : convertLessThanOneThousand(thousands) + " mille") + " ";
    n %= 1000;
  }

  result += convertLessThanOneThousand(n);

  return result.trim();
}