type ButtonProps = React.ComponentProps<"button"> & {
    style?: string;
    type?: string;
    title?: string;
}

export function Button({ style, type = 'button', title, ...props }: ButtonProps){
    return (
        <button 
        className={` bg-emerald-700 border border-white text-white px-4 py-2 rounded-md cursor-pointer hover:bg-emerald-950 hover:scale-105 transition-transform ease-in-out ${style} }`} 
        type={type}
        {...props}>
            {title}
        </button>
    )
}