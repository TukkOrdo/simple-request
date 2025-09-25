interface SyntaxHighlighterProps {
	content: string;
	language: string;
	className?: string;
}

const highlightContent = (content: string, language: string): string => {
	if (!content) return '';
	
	switch (language) {
		case 'json':
			return content
				.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")\s*:/g, '<span class="json-key">$1</span>:')
				.replace(/:\s*("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, ': <span class="json-string">$1</span>')
				.replace(/\[\s*("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, '[ <span class="json-string">$1</span>')
				.replace(/,\s*("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, ', <span class="json-string">$1</span>')
				.replace(/:\s*(true|false)\b/g, ': <span class="json-boolean">$1</span>')
				.replace(/:\s*(null)\b/g, ': <span class="json-null">$1</span>')
				.replace(/:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, ': <span class="json-number">$1</span>');
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
	return (
		<div 
			className={`syntax-highlighter ${className}`}
			dangerouslySetInnerHTML={{ 
				__html: highlightContent(content, language) 
			}}
		/>
	);
}