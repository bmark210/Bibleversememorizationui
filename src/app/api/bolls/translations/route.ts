import { NextResponse } from 'next/server';

const BOLLS_TRANSLATIONS_URL = 'https://bolls.life/static/bolls/app/views/languages.json';

export async function GET() {
  try {
    const response = await fetch(BOLLS_TRANSLATIONS_URL, {
      // Обновляем раз в час, чтобы не дергать внешний ресурс слишком часто
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: 'Не удалось получить переводы Bolls' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Ошибка прокси перевода Bolls:', error);
    return NextResponse.json(
      { message: 'Ошибка при обращении к Bolls' },
      { status: 500 }
    );
  }
}

