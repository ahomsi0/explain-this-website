package parser

import (
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"path/filepath"
	"strings"
	"testing"
)

// House style: nothing the product writes uses the em dash. Most audit text
// is produced in this package and its neighbours, so this walks every string
// literal in the backend's non-test source and fails on one. Comments are
// free to use it; text quoted from an audited site is data, not source.
func TestNoEmDashInStringLiterals(t *testing.T) {
	const emDash = "—"
	root := filepath.Join("..", "..") // backend/

	var checked int
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		fset := token.NewFileSet()
		file, err := parser.ParseFile(fset, path, nil, 0)
		if err != nil {
			return err
		}
		checked++
		ast.Inspect(file, func(n ast.Node) bool {
			lit, ok := n.(*ast.BasicLit)
			if ok && lit.Kind == token.STRING && strings.Contains(lit.Value, emDash) {
				t.Errorf("%s: string literal contains an em dash: %.80s", fset.Position(lit.Pos()), lit.Value)
			}
			return true
		})
		return nil
	})
	if err != nil {
		t.Fatalf("walk backend source: %v", err)
	}
	if checked < 40 {
		t.Fatalf("only checked %d files; the walk is not reaching the backend source", checked)
	}
}
