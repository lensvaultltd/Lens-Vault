

import * as React from "react"

const Slider = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { value: number[], onValueChange: (value: number[]) => void, max?: number, min?: number, step?: number }
>(({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
  
  const percentage = ((value[0] - min) / (max - min)) * 100;

  // Basic interaction, not a full implementation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange([parseFloat(e.target.value)])
  }

  return (
    <span
      ref={ref}
      className={["relative flex w-full touch-none select-none items-center group", className].filter(Boolean).join(" ")}
      {...props}
    >
      <span className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <span className="absolute h-full bg-primary-accent" style={{ width: `${percentage}%` }} />
      </span>
      <span
        className="absolute block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        style={{ left: `calc(${percentage}% - 10px)` }}
      />
      <input type="range" min={min} max={max} step={step} value={value[0]} onChange={handleChange} className="absolute w-full h-full opacity-0 cursor-pointer" />
    </span>
  );
});
Slider.displayName = "Slider"

export { Slider }