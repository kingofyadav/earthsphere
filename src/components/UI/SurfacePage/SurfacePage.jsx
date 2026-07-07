import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, FileText } from 'lucide-react'
import { useEarthStore } from '../../../store/earthStore'
import { PAGE } from '../../../lib/pages'
import styles from './SurfacePage.module.css'

export default function SurfacePage() {
  const currentPage    = useEarthStore(s => s.currentPage)
  const setCurrentPage = useEarthStore(s => s.setCurrentPage)
  const editorRef      = useRef(null)

  useEffect(() => {
    if (currentPage === PAGE.SURFACE) {
      setTimeout(() => editorRef.current?.focus(), 350)
    }
  }, [currentPage])

  return (
    <AnimatePresence>
      {currentPage === PAGE.SURFACE && (
        <motion.div
          key="surface"
          className={styles.container}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          <header className={styles.header}>
            <button
              className={styles.backBtn}
              onClick={() => setCurrentPage(PAGE.EARTH_HERO)}
              aria-label="Back to Earth"
            >
              <ArrowLeft size={13} />
              Earth
            </button>

            <div className={styles.titleRow}>
              <FileText size={13} className={styles.titleIcon} />
              <span className={styles.title}>Surface</span>
            </div>

            <div className={styles.headerSpacer} />
          </header>

          <div className={styles.scroll}>
            <div
              ref={editorRef}
              className={styles.editor}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start writing…"
              aria-label="Writing surface"
              spellCheck
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
