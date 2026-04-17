import { cn } from '@/lib/utils'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export const InputField = ({ label, value, onChange, placeholder, wrapperClassName }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string, wrapperClassName: string }) => {
    return (
        <div className={cn("space-y-2", wrapperClassName)}>
            <Label>{label}</Label>
            <Input
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        </div>)
}