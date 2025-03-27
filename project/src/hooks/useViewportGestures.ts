import { useState, useEffect, useCallback } from 'react';
import { useChartContext } from '../context/ChartContext';

interface GestureState {
  isDragging: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  scale: number;
  initialDistance: number;
}

export const useViewportGestures = (chartRef: React.RefObject<HTMLDivElement>) => {
  const { viewport, setViewport } = useChartContext();
  const [gestureState, setGestureState] = useState<GestureState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    scale: 1,
    initialDistance: 0
  });

  // Handle mouse/touch drag for panning
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setGestureState(prev => ({
      ...prev,
      isDragging: true,
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY
    }));
  }, []);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!gestureState.isDragging) return;

    // Check if dragging started in price scale area (right side)
    const isPriceScaleDrag = gestureState.startX > chartRef.current!.clientWidth - 60;

    if (isPriceScaleDrag) {
      // Reduce sensitivity for price scale dragging
      const sensitivity = 0.5;
      const deltaY = (clientY - gestureState.lastY) * sensitivity;
      
      // Update viewport scale based on vertical drag
      const scaleChange = 1 + (deltaY / 100);
      const newScale = Math.min(Math.max(
        viewport.scale * scaleChange,
        0.1  // Min scale
      ), 10); // Max scale
      
      setViewport(prev => ({
        ...prev,
        scale: newScale
      }));
    } else {
      // Normal horizontal panning
      const deltaX = (clientX - gestureState.lastX) / viewport.scale;
    
      setViewport(prev => ({
        ...prev,
        offset: prev.offset + deltaX,
        visibleRange: {
          start: Math.max(0, prev.visibleRange.start - deltaX),
          end: prev.visibleRange.end - deltaX
        }
      }));
    }

    setGestureState(prev => ({
      ...prev,
      lastX: clientX,
      lastY: clientY
    }));
  }, [gestureState, viewport, setViewport]);

  const handleDragEnd = useCallback(() => {
    setGestureState(prev => ({
      ...prev,
      isDragging: false
    }));
  }, []);

  // Handle pinch zoom on mobile
  const handlePinchStart = useCallback((touches: TouchList) => {
    if (touches.length !== 2) return;

    const distance = Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );

    setGestureState(prev => ({
      ...prev,
      initialDistance: distance
    }));
  }, []);

  const handlePinchMove = useCallback((touches: TouchList) => {
    if (touches.length !== 2 || !gestureState.initialDistance) return;

    const distance = Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );

    const newScale = Math.min(Math.max(
      viewport.scale * (distance / gestureState.initialDistance),
      0.1  // Min scale
    ), 10); // Max scale

    const centerX = (touches[0].clientX + touches[1].clientX) / 2;
    const prevCenterX = centerX / viewport.scale;
    const newCenterX = centerX / newScale;
    const deltaX = prevCenterX - newCenterX;

    setViewport(prev => ({
      ...prev,
      scale: newScale,
      offset: prev.offset + deltaX,
      visibleRange: {
        start: Math.max(0, prev.visibleRange.start + deltaX),
        end: prev.visibleRange.end + deltaX
      }
    }));

    setGestureState(prev => ({
      ...prev,
      initialDistance: distance
    }));
  }, [gestureState, viewport, setViewport]);

  // Mouse event handlers
  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;

    const handleMouseDown = (e: MouseEvent) => {
      handleDragStart(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const scaleChange = 1 - e.deltaY * 0.001;
      const newScale = Math.min(Math.max(
        viewport.scale * scaleChange,
        0.1 // Min scale
      ), 10); // Max scale

      const rect = element.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      // Check if mouse is in price scale area
      const isPriceScale = mouseX > rect.width - 60;
      
      if (isPriceScale) {
        // For price scale, just update scale without offset
        setViewport(prev => ({
          ...prev,
          scale: newScale
        }));
        return;
      }
      
      const prevMouseX = mouseX / viewport.scale;
      const newMouseX = mouseX / newScale;
      const deltaX = prevMouseX - newMouseX;

      setViewport(prev => ({
        ...prev,
        scale: newScale,
        offset: prev.offset + deltaX,
        visibleRange: {
          start: Math.max(0, prev.visibleRange.start + deltaX),
          end: prev.visibleRange.end + deltaX
        }
      }));
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseUp);
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseUp);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [chartRef, handleDragStart, handleDragMove, handleDragEnd, viewport, setViewport]);

  // Touch event handlers
  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        handlePinchStart(e.touches);
      } else {
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        handlePinchMove(e.touches);
      } else {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [chartRef, handleDragStart, handleDragMove, handleDragEnd, handlePinchStart, handlePinchMove]);

  return {
    isDragging: gestureState.isDragging,
    scale: viewport.scale
  };
};