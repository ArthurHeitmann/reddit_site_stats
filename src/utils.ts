
const base36Alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';

export function base36Encode(num: number): string {
	let str = "";
	while (num > 0) {
		const remainder = num % 36;
		num = Math.floor(num / 36);
		str = base36Alphabet[remainder] + str;
	}
	return str;
}

export function base36Decode(str: string): number {
	let num = 0;
	for (let i = 0; i < str.length; i++) {
		const digit = str[i];
		const digitValue = base36Alphabet.indexOf(digit);
		if (digitValue === -1)
			throw new Error(`Invalid base36 digit: ${digit}`);
		num = num * 36 + digitValue;
	}
	return num;
}
