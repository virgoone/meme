import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { AdminPageHeader } from '../lib/admin-ui';

export const Route = createFileRoute('/admin/newsletters/new')({
  component: NewNewsletterPage,
});

function NewNewsletterPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  return (
    <section className='admin-page'>
      <AdminPageHeader title='New Newsletter' description='创建 newsletter 草稿。' />

      <form className='admin-form' onSubmit={(event) => event.preventDefault()}>
        <label htmlFor='newsletter-subject'>
          <span>Title</span>
          <input
            id='newsletter-subject'
            name='subject'
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder='Newsletter subject'
          />
        </label>
        <label htmlFor='newsletter-body'>
          <span>Subject</span>
          <textarea
            id='newsletter-body'
            name='body'
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={18}
            placeholder='Write newsletter body...'
          />
        </label>
        <div className='admin-form__actions'>
          <Link to='/admin/newsletters' className='admin-button secondary'>
            Cancel
          </Link>
          <button className='admin-button' type='submit'>
            Submit
          </button>
        </div>
      </form>
    </section>
  );
}
