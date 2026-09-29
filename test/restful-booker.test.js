/**
 * Testes de integracao - Restful-Booker
 * Padrao AAA: Arrange (preparar), Act (agir), Assert (verificar)
 *
 * Requisitos: Node 18+ (fetch nativo) e Jest. Sem dependencias extras.
 * Sugestao de local no repositorio: tests/restful-booker.test.js
 */

const BASE_URL = 'https://restful-booker.herokuapp.com';

jest.setTimeout(30000); // a API publica pode demorar a responder

// ---------- Helpers ----------

const buildBooking = (overrides = {}) => ({
  firstname: 'Aluno',
  lastname: 'Teste',
  totalprice: 150,
  depositpaid: true,
  bookingdates: {
    checkin: '2026-10-01',
    checkout: '2026-10-05',
  },
  additionalneeds: 'Cafe da manha',
  ...overrides,
});

const request = (path, { method = 'GET', body, headers = {} } = {}) =>
  fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

const getToken = async () => {
  const res = await request('/auth', {
    method: 'POST',
    body: { username: 'admin', password: 'password123' },
  });
  const data = await res.json();
  return data.token;
};

const createBooking = async (overrides = {}) => {
  const res = await request('/booking', {
    method: 'POST',
    body: buildBooking(overrides),
  });
  const data = await res.json();
  return data.bookingid;
};

// ---------- Testes ----------

describe('Restful-Booker API', () => {
  let token;
  const createdIds = [];

  beforeAll(async () => {
    token = await getToken();
  });

  // Limpa as reservas criadas para nao poluir a API compartilhada
  afterAll(async () => {
    await Promise.all(
      createdIds.map((id) =>
        request(`/booking/${id}`, {
          method: 'DELETE',
          headers: { Cookie: `token=${token}` },
        })
      )
    );
  });

  test('POST /auth deve retornar um token com credenciais validas', async () => {
    // Arrange
    const credentials = { username: 'admin', password: 'password123' };

    // Act
    const response = await request('/auth', {
      method: 'POST',
      body: credentials,
    });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
  });

  test('POST /booking deve criar uma reserva e retornar o bookingid', async () => {
    // Arrange
    const newBooking = buildBooking({ firstname: 'Maria', lastname: 'Silva' });

    // Act
    const response = await request('/booking', {
      method: 'POST',
      body: newBooking,
    });
    const body = await response.json();
    createdIds.push(body.bookingid);

    // Assert
    expect(response.status).toBe(200);
    expect(body).toHaveProperty('bookingid');
    expect(body.booking).toEqual(newBooking);
  });

  test('GET /booking/:id deve retornar os dados da reserva criada', async () => {
    // Arrange
    const bookingId = await createBooking({ firstname: 'Joao', totalprice: 200 });
    createdIds.push(bookingId);

    // Act
    const response = await request(`/booking/${bookingId}`);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.firstname).toBe('Joao');
    expect(body.totalprice).toBe(200);
    expect(body.bookingdates).toHaveProperty('checkin');
    expect(body.bookingdates).toHaveProperty('checkout');
  });

  test('PUT /booking/:id deve atualizar a reserva quando autenticado', async () => {
    // Arrange
    const bookingId = await createBooking();
    createdIds.push(bookingId);
    const updatedBooking = buildBooking({
      firstname: 'Aluno Alterado',
      totalprice: 300,
      depositpaid: false,
    });

    // Act
    const response = await request(`/booking/${bookingId}`, {
      method: 'PUT',
      headers: { Cookie: `token=${token}` },
      body: updatedBooking,
    });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.firstname).toBe('Aluno Alterado');
    expect(body.totalprice).toBe(300);
    expect(body.depositpaid).toBe(false);
  });

  test('DELETE /booking/:id deve remover a reserva', async () => {
    // Arrange
    const bookingId = await createBooking();

    // Act
    const deleteResponse = await request(`/booking/${bookingId}`, {
      method: 'DELETE',
      headers: { Cookie: `token=${token}` },
    });
    const getResponse = await request(`/booking/${bookingId}`);

    // Assert
    expect(deleteResponse.status).toBe(201); // comportamento peculiar da API
    expect(getResponse.status).toBe(404);
  });
});
