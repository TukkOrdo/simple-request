import { useResize } from '../hooks/useResize';

interface DragHandleProps {
	direction: 'horizontal' | 'vertical';
	onResize: (delta: number) => void;
}

export function DragHandle({ direction, onResize }: DragHandleProps) {
	const { onMouseDown } = useResize({ direction, onResize });

	return (
		<div
			onMouseDown={onMouseDown}
			className={`drag-handle drag-handle--${direction}`}
			aria-hidden="true"
		>
			<div className="drag-handle__grip" />
		</div>
	);
}