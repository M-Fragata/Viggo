type InputProps = React.ComponentProps<"input">;

export function Input({ placeholder, className = "", type = "text", ...rest }: InputProps) {
  return (
    <input
      type={type}
      className={`border border-gray-300 rounded-md p-2 w-full ${className}`}
      placeholder={placeholder}
      {...rest}
    />
  );
}