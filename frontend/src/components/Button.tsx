type ButtonProps = React.ComponentProps<"button"> & {
    style?: string;
    type?: string;
    title?: string;
}

export function Button({ style, type = 'button', title, ...props }: ButtonProps){
    return (
        <button 
        className={`bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 ${style}`} 
        type={type}
        {...props}>
            {title}
        </button>
    )
}