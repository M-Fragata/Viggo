type InputProps = React.ComponentProps<"input"> & {
    placeholder?: string;
    style?: string;
    type?: string;
}

export function Input({ placeholder, style, type = 'text', ...rest }: InputProps){
    return (
        <input type={type} className={`border border-gray-300 rounded-md p-2 w-full ${style}`} placeholder={placeholder} {...rest} />
    )
}