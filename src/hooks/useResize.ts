import { useCallback, useRef } from 'react';

type Direction = 'horizontal' | 'vertical';

interface UseResizeOptions {
	direction: Direction;
	onResize: (delta: number) => void;
}

export function useResize({ direction, onResize }: UseResizeOptions) {
	const isDragging = useRef(false);
	const lastPos = useRef(0);

	const onMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			isDragging.current = true;
			lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY;

			const onMouseMove = (e: MouseEvent) => {
				if (!isDragging.current) return;
				const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
				const delta = currentPos - lastPos.current;
				lastPos.current = currentPos;
				onResize(delta);
			};

			const onMouseUp = () => {
				isDragging.current = false;
				window.removeEventListener('mousemove', onMouseMove);
				window.removeEventListener('mouseup', onMouseUp);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
			};

			document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
			document.body.style.userSelect = 'none';
			window.addEventListener('mousemove', onMouseMove);
			window.addEventListener('mouseup', onMouseUp);
		},
		[direction, onResize]
	);

	return { onMouseDown };
}