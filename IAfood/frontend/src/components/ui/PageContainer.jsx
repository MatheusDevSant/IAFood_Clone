import * as React from 'react'

/**
 * PageContainer aplica um wrapper padrão para páginas: fundo, cor de texto e padding.
 * Use `innerClassName` para controlar o container interno (max-w / padding) sem alterar o conteúdo.
 */
export default function PageContainer({ children, innerClassName = 'max-w-6xl mx-auto px-6 py-10', className = '' }) {
  return (
    <div className={`min-h-screen bg-background text-foreground transition-colors ${className}`}>
      <div className={innerClassName}>{children}</div>
    </div>
  )
}
