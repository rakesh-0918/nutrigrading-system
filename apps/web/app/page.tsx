import Link from 'next/link';

export default function Page() {
  return (
    <main className="container">
      <div className="card">
        <div className="h1">Srujuna</div>
        <p className="small">
          Voice-first food risk education. No diagnosis—only “risk associations”. Nutrition is calculated only from trusted APIs.
        </p>
        <div className="row">
          <Link href="/login"><button className="primary">Login (Voice/Tap)</button></Link>
          <Link href="/signup"><button>Sign up (Voice/Tap)</button></Link>
        </div>
      </div>
    </main>
  );
}


