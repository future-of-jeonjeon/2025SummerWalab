<template>
  <div class="workbook-list">
    <div class="header">
      <h2>문제집 목록</h2>
      <el-button type="primary" @click="$router.push('/workbook/create')">
        <i class="el-icon-plus"></i>문제집 생성
      </el-button>
    </div>

    <el-table :data="workbooks" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80"></el-table-column>
      <el-table-column prop="title" label="제목"></el-table-column>
      <el-table-column prop="category" label="카테고리" width="120"></el-table-column>
      <el-table-column prop="created_by" label="생성자" width="120"></el-table-column>
      <el-table-column prop="created_at" label="생성일" width="180">
        <template slot-scope="scope">
          {{ formatDate(scope.row.created_at) }}
        </template>
      </el-table-column>

      <el-table-column label="작업" width="150">
        <template slot-scope="scope">
          <el-button size="mini" @click="editWorkbook(scope.row)">수정</el-button>
          <el-button size="mini" type="danger" @click="deleteWorkbook(scope.row)">삭제</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        @current-change="handleCurrentChange"
        :current-page="currentPage"
        :page-size="pageSize"
        layout="total, prev, pager, next"
        :total="total">
      </el-pagination>
    </div>
  </div>
</template>

<script>
import api from '../../api'

export default {
  name: 'WorkbookList',
  data () {
    return {
      workbooks: [],
      loading: false,
      currentPage: 1,
      pageSize: 10,
      total: 0
    }
  },
  mounted () {
    this.getWorkbooks()
  },
  methods: {
    getWorkbooks () {
      this.loading = true
      const offset = (this.currentPage - 1) * this.pageSize
      api.getWorkbookList(offset, this.pageSize).then(res => {
        this.workbooks = res.data.data.results || []
        this.total = res.data.data.total || 0
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    handleCurrentChange (page) {
      this.currentPage = page
      this.getWorkbooks()
    },
    editWorkbook (workbook) {
      this.$router.push(`/workbook/edit/${workbook.id}`)
    },
    deleteWorkbook (workbook) {
      this.$confirm('정말 삭제하시겠습니까?', '확인', {
        confirmButtonText: '삭제',
        cancelButtonText: '취소',
        type: 'warning'
      }).then(() => {
        api.deleteWorkbook(workbook.id).then(() => {
          this.$message.success('삭제되었습니다')
          this.getWorkbooks()
        })
      })
    },
    formatDate (dateString) {
      return new Date(dateString).toLocaleDateString('ko-KR')
    }
  }
}
</script>

<style scoped>
.workbook-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}
</style> 