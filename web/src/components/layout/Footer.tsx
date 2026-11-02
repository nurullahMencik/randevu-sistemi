import { BookOpenText, FolderGit2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { API_URL } from '../../lib/env'
import { useI18n } from '../../lib/i18n/context'

export function Footer({ wide }: { wide: boolean }) {
  const { t } = useI18n()
  return (
    <footer className="mt-16 border-t border-border">
      <div className={cn('mx-auto flex flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6', wide ? 'max-w-[1500px]' : 'max-w-6xl')}>
        <p className="max-w-xl">{t('footer.demo')}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <a className="inline-flex items-center gap-1.5 rounded hover:text-ink" href={`${API_URL}/scalar`} target="_blank" rel="noreferrer">
            <BookOpenText className="size-4" aria-hidden />
            {t('common.apiDocs')}
          </a>
          <a className="inline-flex items-center gap-1.5 rounded hover:text-ink" href="https://github.com/nurullahmencik/randevu-sistemi" target="_blank" rel="noreferrer">
            <FolderGit2 className="size-4" aria-hidden />
            {t('common.sourceCode')}
          </a>
          <span>{t('footer.by')}</span>
        </div>
      </div>
    </footer>
  )
}
