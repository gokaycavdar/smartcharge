package testutil

import (
	"context"
	"reflect"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type FakeDB struct {
	ExecFn     func(context.Context, string, ...interface{}) (pgconn.CommandTag, error)
	QueryFn    func(context.Context, string, ...interface{}) (pgx.Rows, error)
	QueryRowFn func(context.Context, string, ...interface{}) pgx.Row
}

func (f *FakeDB) Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error) {
	if f.ExecFn != nil {
		return f.ExecFn(ctx, sql, args...)
	}
	return pgconn.CommandTag{}, nil
}

func (f *FakeDB) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	if f.QueryFn != nil {
		return f.QueryFn(ctx, sql, args...)
	}
	return NewRows(), nil
}

func (f *FakeDB) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	if f.QueryRowFn != nil {
		return f.QueryRowFn(ctx, sql, args...)
	}
	return NewRowError(pgx.ErrNoRows)
}

type fakeRow struct {
	values []any
	err    error
}

func NewRow(values ...any) pgx.Row {
	return &fakeRow{values: values}
}

func NewRowError(err error) pgx.Row {
	return &fakeRow{err: err}
}

func (r *fakeRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	return scanValues(r.values, dest...)
}

type fakeRows struct {
	rows [][]any
	idx  int
	err  error
}

func NewRows(rows ...[]any) pgx.Rows {
	return &fakeRows{rows: rows, idx: -1}
}

func NewRowsError(err error) pgx.Rows {
	return &fakeRows{idx: -1, err: err}
}

func (r *fakeRows) Close() {}

func (r *fakeRows) Err() error { return r.err }

func (r *fakeRows) CommandTag() pgconn.CommandTag { return pgconn.CommandTag{} }

func (r *fakeRows) FieldDescriptions() []pgconn.FieldDescription { return nil }

func (r *fakeRows) Next() bool {
	if r.err != nil {
		return false
	}
	r.idx++
	return r.idx < len(r.rows)
}

func (r *fakeRows) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if r.idx < 0 || r.idx >= len(r.rows) {
		return pgx.ErrNoRows
	}
	return scanValues(r.rows[r.idx], dest...)
}

func (r *fakeRows) Values() ([]any, error) {
	if r.err != nil {
		return nil, r.err
	}
	if r.idx < 0 || r.idx >= len(r.rows) {
		return nil, pgx.ErrNoRows
	}
	return r.rows[r.idx], nil
}

func (r *fakeRows) RawValues() [][]byte { return nil }

func (r *fakeRows) Conn() *pgx.Conn { return nil }

func scanValues(values []any, dest ...any) error {
	for i := range dest {
		if i >= len(values) {
			break
		}
		if err := assignValue(dest[i], values[i]); err != nil {
			return err
		}
	}
	return nil
}

func assignValue(dst any, src any) error {
	if dst == nil {
		return nil
	}

	rv := reflect.ValueOf(dst)
	if rv.Kind() != reflect.Pointer || rv.IsNil() {
		return nil
	}

	target := rv.Elem()
	if src == nil {
		target.Set(reflect.Zero(target.Type()))
		return nil
	}

	value := reflect.ValueOf(src)
	if value.Type().AssignableTo(target.Type()) {
		target.Set(value)
		return nil
	}
	if value.Type().ConvertibleTo(target.Type()) {
		target.Set(value.Convert(target.Type()))
		return nil
	}

	return nil
}

type FakePool struct {
	ExecFn     func(context.Context, string, ...interface{}) (pgconn.CommandTag, error)
	QueryFn    func(context.Context, string, ...interface{}) (pgx.Rows, error)
	QueryRowFn func(context.Context, string, ...interface{}) pgx.Row
	BeginTxFn  func(context.Context, pgx.TxOptions) (pgx.Tx, error)
}

func (f *FakePool) Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error) {
	if f.ExecFn != nil {
		return f.ExecFn(ctx, sql, args...)
	}
	return pgconn.CommandTag{}, nil
}

func (f *FakePool) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	if f.QueryFn != nil {
		return f.QueryFn(ctx, sql, args...)
	}
	return NewRows(), nil
}

func (f *FakePool) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	if f.QueryRowFn != nil {
		return f.QueryRowFn(ctx, sql, args...)
	}
	return NewRowError(pgx.ErrNoRows)
}

func (f *FakePool) BeginTx(ctx context.Context, txOptions pgx.TxOptions) (pgx.Tx, error) {
	if f.BeginTxFn != nil {
		return f.BeginTxFn(ctx, txOptions)
	}
	return &FakeTx{}, nil
}

type FakeTx struct {
	ExecFn     func(context.Context, string, ...any) (pgconn.CommandTag, error)
	QueryFn    func(context.Context, string, ...any) (pgx.Rows, error)
	QueryRowFn func(context.Context, string, ...any) pgx.Row
	CommitFn   func(context.Context) error
	RollbackFn func(context.Context) error
}

func (f *FakeTx) Begin(_ context.Context) (pgx.Tx, error) {
	return f, nil
}

func (f *FakeTx) Commit(ctx context.Context) error {
	if f.CommitFn != nil {
		return f.CommitFn(ctx)
	}
	return nil
}

func (f *FakeTx) Rollback(ctx context.Context) error {
	if f.RollbackFn != nil {
		return f.RollbackFn(ctx)
	}
	return nil
}

func (f *FakeTx) CopyFrom(_ context.Context, _ pgx.Identifier, _ []string, _ pgx.CopyFromSource) (int64, error) {
	return 0, nil
}

func (f *FakeTx) SendBatch(_ context.Context, _ *pgx.Batch) pgx.BatchResults {
	return nil
}

func (f *FakeTx) LargeObjects() pgx.LargeObjects {
	return pgx.LargeObjects{}
}

func (f *FakeTx) Prepare(_ context.Context, _ string, _ string) (*pgconn.StatementDescription, error) {
	return nil, nil
}

func (f *FakeTx) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	if f.ExecFn != nil {
		return f.ExecFn(ctx, sql, args...)
	}
	return pgconn.CommandTag{}, nil
}

func (f *FakeTx) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	if f.QueryFn != nil {
		return f.QueryFn(ctx, sql, args...)
	}
	return NewRows(), nil
}

func (f *FakeTx) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	if f.QueryRowFn != nil {
		return f.QueryRowFn(ctx, sql, args...)
	}
	return NewRowError(pgx.ErrNoRows)
}

func (f *FakeTx) Conn() *pgx.Conn {
	return nil
}
