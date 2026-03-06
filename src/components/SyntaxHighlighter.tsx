interface SyntaxHighlighterProps {
	content: string;
	language: string;
	className?: string;
}

const getJsonErrorPosition = (content: string): number | null => {
	try {
		JSON.parse(content);
		return null;
	} catch (e) {
		if (e instanceof SyntaxError) {
			// Chrome/Edge: "at position N"
			const posMatch = e.message.match(/at position (\d+)/);
			if (posMatch) return parseInt(posMatch[1]);
			// Firefox: "at line N column N"
			const lineColMatch = e.message.match(/at line (\d+) column (\d+)/);
			if (lineColMatch) {
				const line = parseInt(lineColMatch[1]);
				const col = parseInt(lineColMatch[2]);
				const lines = content.split('\n');
				let pos = 0;
				for (let i = 0; i < line - 1 && i < lines.length; i++) {
					pos += lines[i].length + 1;
				}
				return pos + col - 1;
			}
		}
		return null;
	}
};

// Walk the highlighted HTML, skipping tag characters, until we reach
// the nth content character. Insert an error span there if needed.
const insertErrorSpan = (html: string, pos: number): string => {
	let contentPos = 0;
	let htmlIdx = 0;

	while (htmlIdx < html.length && contentPos < pos) {
		if (html[htmlIdx] === '<') {
			while (htmlIdx < html.length && html[htmlIdx] !== '>') htmlIdx++;
		} else {
			contentPos++;
		}
		htmlIdx++;
	}

	const errorChar = html[htmlIdx] ?? '';
	return (
		html.substring(0, htmlIdx) +
		'<span class="json-error">' + errorChar + '</span>' +
		html.substring(htmlIdx + 1)
	);
};

const highlightContent = (content: string, language: string): string => {
	if (!content) return '';

	switch (language) {
		case 'json': {
			const errorPos = getJsonErrorPosition(content);

			let result = content
				.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")\s*:/g, '<span class="json-key">$1</span>:')
				.replace(/:\s*("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, ': <span class="json-string">$1</span>')
				.replace(/\[[ \t]*("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, '[<span class="json-string">$1</span>')
				.replace(/,([ \t]*)("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, ',$1<span class="json-string">$2</span>')
				.replace(/:\s*(true|false)\b/g, ': <span class="json-boolean">$1</span>')
				.replace(/:\s*(null)\b/g, ': <span class="json-null">$1</span>')
				.replace(/:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?=\s*[,\n\r}\]])/g, ': <span class="json-number">$1</span>')

			if (errorPos !== null) {
				result = insertErrorSpan(result, errorPos);
			}

			return result;
		}
		case 'x-www-form-urlencoded':
			return content
				.replace(/([^&=\s]+)=/g, '<span class="json-key">$1</span>=')
				.replace(/=([^&\s]+)/g, '=<span class="json-string">$1</span>');
		case 'form-data':
			return content
				.replace(/^([^:\r\n]+):/gm, '<span class="json-key">$1</span>:')
				.replace(/:\s*([^\r\n]+)/g, ': <span class="json-string">$1</span>');
		case 'html':
		case 'xml':
			return content
				.replace(/(&lt;\/?)(\w+)([^&gt;]*&gt;)/g, '$1<span class="xml-tag">$2</span>$3')
				.replace(/(\w+)=("[^"]*")/g, '<span class="xml-attr-name">$1</span>=<span class="xml-attr-value">$2</span>');
		default:
			return content;
	}
};

export function SyntaxHighlighter({ content, language, className = '' }: SyntaxHighlighterProps) {
	const highlighted = highlightContent(content, language);
	const lines = highlighted.split('\n');

	return (
		<div className={`syntax-highlighter ${className}`} style={{ display: 'flex' }}>
			<div className="syntax-line-numbers" aria-hidden="true">
				{lines.map((_, i) => (
					<span key={i}>{i + 1}</span>
				))}
			</div>
			<div
				className="syntax-highlighter-content"
				dangerouslySetInnerHTML={{ __html: highlighted }}
			/>
		</div>
	);
}