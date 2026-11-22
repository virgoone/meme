import { Calendar } from '@bunship-ai/ui/components/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@bunship-ai/ui/components/popover';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@bunship-ai/ui/components/select';
import { CalendarClock } from 'lucide-react';
import { zhCN } from 'react-day-picker/locale';
import { Button } from './ui';

const pad = (n: number) => String(n).padStart(2, '0');

export function PublishDatePicker({ id, value, onChange }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [date, time = '00:00'] = value.split('T');
  const [hour, minute] = time.split(':');
  const selected = value ? new Date(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button id={id} type='button' variant='secondary' className='h-9 w-full justify-start rounded-ui-sm border-input bg-surface-medium px-3 font-normal'>
          <CalendarClock />{value ? value.replace('T', ' ') : '选择日期和时间'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-auto rounded-xl border-border-light bg-surface p-3'>
        <Calendar
          className='bg-transparent p-0'
          classNames={{
            month: 'flex w-full flex-col gap-2',
            week: 'mt-0.5 flex w-full',
            outside: 'opacity-40',
            today: 'font-semibold underline underline-offset-4',
          }}
          locale={zhCN} mode='single' selected={selected} defaultMonth={selected} onSelect={(day) => {
          if (day) onChange([day.getFullYear(), pad(day.getMonth() + 1), pad(day.getDate())].join('-') + 'T' + time);
        }} />
        <div className='mt-2 flex items-center gap-1 border-t border-border-light pt-2'>
          <span className='mr-auto text-description type-sm'>时间</span>
          {['小时', '分钟'].map((label, index) => (
            <div key={label} className='flex items-center gap-1'>
              {index === 1 && <span aria-hidden='true'>:</span>}
              <Select disabled={!date} value={index === 0 ? hour : minute} onValueChange={(v) => {
              onChange(date + 'T' + (index === 0 ? v + ':' + minute : hour + ':' + v));
            }}>
              <SelectTrigger aria-label={label} className='h-8 min-h-8 w-14 gap-1 px-2 tabular-nums'><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: index === 0 ? 24 : 60 }, (_, n) => <SelectItem key={n} value={pad(n)}>{pad(n)}</SelectItem>)}
              </SelectContent>
              </Select>
            </div>
          ))}
          {date && <Button type='button' variant='ghost' size='sm' onClick={() => onChange('')}>清空</Button>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
