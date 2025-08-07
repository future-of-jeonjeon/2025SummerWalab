<template>
  <div class="workbook-list">
    <Panel shadow>
      <div slot="title">{{ $t('m.Workbooks') }}</div>
      <div slot="extra">
        <ul class="filter">
          <li>
            <Input v-model="query.keyword"
                   @on-enter="filterByKeyword"
                   @on-click="filterByKeyword"
                   placeholder="keyword"
                   icon="ios-search-strong"/>
          </li>
          <li>
            <Button type="info" @click="onReset">
              <Icon type="refresh"></Icon>
              {{ $t('m.Reset') }}
            </Button>
          </li>
        </ul>
      </div>
      <Table style="width: 100%; font-size: 16px;"
             :columns="workbookTableColumns"
             :data="workbookList"
             :loading="loadings.table"
             disabled-hover></Table>
    </Panel>
    <Pagination
      :total="total" 
      :page-size.sync="query.limit" 
      @on-change="pushRouter" 
      @on-page-size-change="pushRouter" 
      :current.sync="query.page" 
      :show-sizer="true">
    </Pagination>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import api from '@oj/api'
import utils from '@/utils/utils'
import Pagination from '@oj/components/Pagination'

export default {
  name: 'WorkbookList',
  components: {
    Pagination
  },
  data () {
    return {
      workbookTableColumns: [
        {
          title: '#',
          key: 'id',
          width: 80,
          render: (h, params) => {
            return h('Button', {
              props: {
                type: 'text',
                size: 'large'
              },
              on: {
                click: () => {
                  this.$router.push({name: 'workbook-problems', params: {workbookID: params.row.id}})
                }
              },
              style: {
                padding: '2px 0'
              }
            }, params.row.id)
          }
        },
        {
          title: this.$i18n.t('m.Title'),
          width: 400,
          render: (h, params) => {
            return h('Button', {
              props: {
                type: 'text',
                size: 'large'
              },
              on: {
                click: () => {
                  this.$router.push({name: 'workbook-problems', params: {workbookID: params.row.id}})
                }
              },
              style: {
                padding: '2px 0',
                overflowX: 'auto',
                textAlign: 'left',
                width: '100%'
              }
            }, params.row.title)
          }
        },
        {
          title: this.$i18n.t('m.Category'),
          key: 'category',
          width: 150
        },
        {
          title: this.$i18n.t('m.Created_By'),
          key: 'created_by',
          width: 120
        },
        {
          title: this.$i18n.t('m.Created_At'),
          key: 'created_at',
          width: 150,
          render: (h, params) => {
            return h('span', this.formatDate(params.row.created_at))
          }
        }
      ],
      workbookList: [],
      total: 0,
      loadings: {
        table: true
      },
      query: {
        keyword: '',
        page: 1,
        limit: 10
      }
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    init (simulate = false) {
      let query = this.$route.query
      this.query.keyword = query.keyword || ''
      this.query.page = parseInt(query.page) || 1
      if (this.query.page < 1) {
        this.query.page = 1
      }
      this.query.limit = parseInt(query.limit) || 10
      this.getWorkbookList()
    },
    pushRouter () {
      this.$router.push({
        name: 'workbook-list',
        query: utils.filterEmptyValue(this.query)
      })
    },
    getWorkbookList () {
      let offset = (this.query.page - 1) * this.query.limit
      this.loadings.table = true
      api.getWorkbookList(offset, this.query.limit, this.query).then(res => {
        this.loadings.table = false
        this.total = res.data.data.total
        this.workbookList = res.data.data.results
      }, res => {
        this.loadings.table = false
      })
    },
    filterByKeyword () {
      this.query.page = 1
      this.pushRouter()
    },
    onReset () {
      this.$router.push({name: 'workbook-list'})
    },
    formatDate (dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString()
    }
  },
  watch: {
    '$route' (newVal, oldVal) {
      if (newVal !== oldVal) {
        this.init(true)
      }
    }
  }
}
</script>

<style scoped>
.workbook-list {
  padding: 20px;
}

.filter {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.filter li {
  margin-right: 10px;
}

.filter li:last-child {
  margin-right: 0;
}
</style> 