// Пример реализации GET /api/users/leaderboard для Go-сервиса (Railway).
// Скопируйте логику в свой хендлер и подставьте реальные запросы к БД.
//
// Query:
//   telegramId  — текущий пользователь (для currentUser и якорной страницы)
//   page        — 1-based; если параметр отсутствует — страница, где находится пользователь
//   pageSize    — по умолчанию 5, разумный максимум 50
//   limit       — legacy: если фронт не шлёт page/pageSize, можно сохранить старое поведение
//
// Ответ JSON (domain.UserLeaderboardResponse):
//   items, totalParticipants, currentUser,
//   page, pageSize, totalPages

package leaderboardpaginationexample
 
import (
	"math"
	"strconv"
)

const defaultPageSize = 5
const maxPageSize = 50

func clampPageSize(v int) int {
	if v <= 0 {
		return defaultPageSize
	}
	if v > maxPageSize {
		return maxPageSize
	}
	return v
}

// RankLeaderboardUser — строка в полном упорядоченном списке (как в вашей БД).
type RankLeaderboardUser struct {
	TelegramID  string
	Name        string
	Nickname    string
	AvatarURL   string
	Xp          int
	VersesCount int
}

// BuildLeaderboardPage — чистая логика пагинации поверх уже отсортированного слайса (по XP desc).
func BuildLeaderboardPage(
	all []RankLeaderboardUser,
	viewerTelegramID string,
	pageParam *int,
	pageSizeRaw int,
) (items []RankLeaderboardUser, page int, pageSize int, totalPages int, viewerRank int) {
	pageSize = clampPageSize(pageSizeRaw)
	n := len(all)
	totalPages = int(math.Max(1, math.Ceil(float64(n)/float64(pageSize))))

	viewerRank = 0
	if viewerTelegramID != "" {
		for i, u := range all {
			if u.TelegramID == viewerTelegramID {
				viewerRank = i + 1
				break
			}
		}
	}

	if pageParam == nil {
		if viewerRank >= 1 {
			page = (viewerRank-1)/pageSize + 1
		} else {
			page = 1
		}
	} else {
		page = *pageParam
		if page < 1 {
			page = 1
		}
		if page > totalPages {
			page = totalPages
		}
	}

	start := (page - 1) * pageSize
	if start > n {
		start = n
	}
	end := start + pageSize
	if end > n {
		end = n
	}
	if start < end {
		items = append([]RankLeaderboardUser(nil), all[start:end]...)
	} else {
		items = []RankLeaderboardUser{}
	}
	return
}

// ParseOptionalInt — для query "page": если параметра нет, вернуть nil.
func ParseOptionalInt(raw string) *int {
	if raw == "" {
		return nil
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return nil
	}
	return &v
}
