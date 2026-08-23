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
  private originalInnerHTML: string;

  constructor(element: HTMLElement, options: TextSplitterOptions = { type: 'chars' }) {
    this.element = element;
    this.options = options;
    this.originalInnerHTML = element.innerHTML;
    this.split();
  }

  private split(): void {
    if (this.options.type === 'lines') {
      this.splitByLines();
    } else {
      this.splitNode(this.element);
    }
  }

  private splitNode(node: Node): void {
    const childNodes = Array.from(node.childNodes);
    childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text.trim() === '' && text.includes(' ')) {
          // It's just whitespace between elements
          return;
        }

        const fragment = document.createDocumentFragment();
        if (this.options.type === 'chars') {
          this.splitTextToChars(text, fragment);
        } else if (this.options.type === 'words') {
          this.splitTextToWords(text, fragment);
        }
        node.replaceChild(fragment, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        this.splitNode(child as HTMLElement);
      }
    });
  }

  private splitTextToChars(text: string, target: DocumentFragment): void {
    const words = text.split(' ');

    words.forEach((word, wordIndex) => {
      if (word.length === 0 && wordIndex > 0) {
        target.appendChild(document.createTextNode(' '));
        return;
      }

      const wordSpan = document.createElement('span');
      wordSpan.style.display = 'inline-block';
      wordSpan.style.whiteSpace = 'nowrap';

      if (this.options.wordsClass) {
        wordSpan.className = this.options.wordsClass;
      }

      const chars = word.split('');
      chars.forEach((char) => {
        const charSpan = document.createElement('span');
        charSpan.textContent = char;
        charSpan.style.display = 'inline-block';
        if (this.options.charsClass) {
          charSpan.className = this.options.charsClass;
        }
        wordSpan.appendChild(charSpan);
        this.splitElements.push(charSpan);
      });

      target.appendChild(wordSpan);

      if (wordIndex < words.length - 1) {
        target.appendChild(document.createTextNode(' '));
      }
    });
  }

  private splitTextToWords(text: string, target: DocumentFragment): void {
    const words = text.split(' ');

    words.forEach((word, index) => {
      if (word.length === 0 && index > 0) {
        target.appendChild(document.createTextNode(' '));
        return;
      }

      const wordSpan = document.createElement('span');
      wordSpan.textContent = word;
      wordSpan.style.display = 'inline-block';
      wordSpan.style.whiteSpace = 'nowrap';

      if (this.options.wordsClass) {
        wordSpan.className = this.options.wordsClass;
      }

      target.appendChild(wordSpan);
      this.splitElements.push(wordSpan);

      if (index < words.length - 1) {
        target.appendChild(document.createTextNode(' '));
      }
    });
  }

  private splitByLines(): void {
    const text = this.element.textContent || '';
    this.element.textContent = '';
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
    this.element.innerHTML = this.originalInnerHTML;
    this.splitElements = [];
  }
}

