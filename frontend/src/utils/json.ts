// Trigger a browser download of a JSON object (download as file from JSON response)
export function downloadJson(data: object, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    a.href = url
    a.download = filename.endsWith('.json') ? filename : `${filename}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

// Open a file picker and resolve with the parsed JSON contents.
// Rejects if the file is not valid JSON.
export function pickJsonFile(): Promise<object | null> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input')
        
        input.type = 'file'
        input.accept = '.json,application/json'
        input.onchange = () => {
            const file = input.files?.[0]
            if (!file) { resolve(null); return }  // user cancelled
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target?.result as string)
                    resolve(parsed)
                } catch {
                    reject(new Error('Invalid JSON file'))
                }
            }
            reader.readAsText(file)
        }
        // Also handle cancel on focus out
        window.addEventListener('focus', () => {
            setTimeout(() => {
                if (!input.files?.length) resolve(null)
            }, 300)
        }, { once: true })
        input.click()
    })
}