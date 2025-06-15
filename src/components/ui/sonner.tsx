

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:absolute group-[.toast]:right-2 group-[.toast]:top-2",
        },
      }}
      position="bottom-center"
      closeButton
      offset={96} // Positioned 96px from the bottom to clear sticky nav (80px) + spacing (16px)
      style={{
        left: 'var(--sidebar-width, 240px)',
        right: '0',
        width: 'auto',
        maxWidth: '420px',
        margin: '0 auto',
      }}
      {...props}
    />
  )
}

export { Toaster, toast }

