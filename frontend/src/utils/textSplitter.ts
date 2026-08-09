export interface TextSplitterOptions {
  type: 'chars' | 'words' | 'lines';
  charsClass?: string;
  wordsClass?: string;
  linesClass?: string;
}

export class TextSplitter {
  private element: HTMLElement;
  private options: TextSplitterOptions;
  private splitElements: HTMLElement[] = [];

  constructor(element: HTMLElement, options: TextSplitterOptions = { type: 'chars' }) {
    this.element = element;
    this.options = options;
    this.split();
  }

  private split(): void {
    const text = this.element.textContent || '';
    this.element.textContent = '';

    if (this.options.type === 'chars') {
      this.splitByChars(text);
    } else if (this.options.type === 'words') {
      this.splitByWords(text);
    } else if (this.options.type === 'lines') {
      this.splitByLines(text);
    }
  }

  private splitByChars(text: string): void {
    const words = text.split(' ');

    words.forEach((word, wordIndex) => {
      const wordSpan = document.createElement('span');
      wordSpan.style.display = 'inline-block';
      wordSpan.style.whiteSpace = 'nowrap';

      if (this.options.charsClass) {
        wordSpan.className = this.options.charsClass;
      }

      const chars = word.split('');
      chars.forEach((char) => {
        const charSpan = document.createElement('span');
        charSpan.textContent = char;
        charSpan.style.display = 'inline-block';
        wordSpan.appendChild(charSpan);
        this.splitElements.push(charSpan);
      });

      this.element.appendChild(wordSpan);

      if (wordIndex < words.length - 1) {
        const space = document.createTextNode(' ');
        this.element.appendChild(space);
      }
    });
  }

  private splitByWords(text: string): void {
    const words = text.split(' ');

    words.forEach((word, index) => {
      const wordSpan = document.createElement('span');
      wordSpan.textContent = word;
      wordSpan.style.display = 'inline-block';
      wordSpan.style.whiteSpace = 'nowrap';

      if (this.options.wordsClass) {
        wordSpan.className = this.options.wordsClass;
      }

      this.element.appendChild(wordSpan);
      this.splitElements.push(wordSpan);

      if (index < words.length - 1) {
        const space = document.createTextNode(' ');
        this.element.appendChild(space);
      }
    });
  }

  private splitByLines(text: string): void {
    const lines = text.split('\n');

    lines.forEach((line) => {
      const lineSpan = document.createElement('span');
      lineSpan.textContent = line;
      lineSpan.style.display = 'block';

      if (this.options.linesClass) {
        lineSpan.className = this.options.linesClass;
      }

      this.element.appendChild(lineSpan);
      this.splitElements.push(lineSpan);
    });
  }

  getElements(): HTMLElement[] {
    return this.splitElements;
  }

  revert(): void {
    this.element.textContent = this.splitElements.map(el => el.textContent).join('');
    this.splitElements = [];
  }
}
